require("dotenv").config({ path: ".env.local" });
const crypto = require("crypto");

const SPREADSHEET_ID =
  process.env.GOOGLE_SPREADSHEET_ID_CLIENTES ||
  process.env.GOOGLE_SPREADSHEETS_ID_CLIENTES ||
  "";

// Aba dos clientes na planilha (troque pelo nome exato se for outro)
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME_CLIENTES || "Clientes";

// Linha 1 = "Nomes" | Linha 2 = cabeçalhos | Dados começam na linha 3
const PRIMEIRA_LINHA = 3;

function base64url(texto) {
  return Buffer.from(texto, "utf8").toString("base64url");
}

function normalizar(texto) {
  return String(texto || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

async function getAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || "";
  privateKey = privateKey.replace(/\\n/g, "\n");

  if (!email) throw new Error("Variavel GOOGLE_SERVICE_ACCOUNT_EMAIL nao configurada.");
  if (!privateKey) throw new Error("Variavel GOOGLE_PRIVATE_KEY nao configurada.");

  const agora = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      exp: agora + 3600,
      iat: agora,
    })
  );

  const assinatura = crypto
    .createSign("RSA-SHA256")
    .update(`${header}.${claims}`)
    .sign(privateKey);

  const resposta = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${base64url(assinatura)}`,
    }),
  });

  const dados = await resposta.json();
  if (!resposta.ok) {
    throw new Error(dados.error_description || "Falha ao autenticar no Google.");
  }
  return dados.access_token;
}

async function chamarSheets(token, url, opcoes = {}) {
  const resposta = await fetch(url, {
    ...opcoes,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(opcoes.headers || {}),
    },
  });

  const texto = await resposta.text();
  let dados = null;
  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    dados = null;
  }

  if (!resposta.ok) {
    if (dados && dados.error && dados.error.message) {
      throw new Error(dados.error.message);
    }
    throw new Error(`Google respondeu ${resposta.status}: ${texto.slice(0, 150)}`);
  }
  return dados || {};
}

function abaFormatada(titulo) {
  return `'${String(titulo).replace(/'/g, "''")}'`;
}

function codificarRange(range) {
  return encodeURIComponent(range)
    .replace(/%27/g, "'")
    .replace(/%21/g, "!")
    .replace(/%20/g, " ");
}

async function localizarAba(token, base) {
  const meta = await chamarSheets(token, base);
  const alvo = normalizar(SHEET_NAME);

  const aba = (meta.sheets || []).find(
    (s) => normalizar(s.properties?.title) === alvo
  );

  if (!aba) {
    const disponiveis = (meta.sheets || [])
      .map((s) => s.properties?.title)
      .join(", ");
    throw new Error(
      `A aba "${SHEET_NAME}" nao foi encontrada na planilha. Abas disponiveis: ${disponiveis || "nenhuma"}`
    );
  }

  return aba.properties;
}

// Le todas as linhas (A = dono | B = animal | C = cell | D = endereco | E = imagem)
async function lerClientes(token, base, aba) {
  const url = `${base}/values/${codificarRange(`${aba}!A:E`)}?majorDimension=ROWS`;
  const dados = await chamarSheets(token, url);
  const linhas = dados.values || [];

  const clientes = [];
  for (let i = PRIMEIRA_LINHA - 1; i < linhas.length; i++) {
    const coluna = linhas[i];
    const valor = (indice) => (coluna[indice] === undefined ? "" : String(coluna[indice]));
    const cliente = {
      linha: i + 1,
      dono: valor(0),
      animal: valor(1),
      cell: valor(2),
      endereco: valor(3),
      imagem: valor(4),
    };
    const vazia = !cliente.dono && !cliente.animal;
    if (!vazia) clientes.push(cliente);
  }
  return clientes;
}

// Aceita a linha vinda de varios lugares:
// req.query (Vercel), ?linha= na URL, ou dentro do JSON do corpo
function extrairLinha(req) {
  let corpo = req.body || {};
  if (typeof corpo === "string") {
    try {
      corpo = JSON.parse(corpo);
    } catch {
      corpo = {};
    }
  }

  let bruto = "";
  if (req.query && req.query.linha !== undefined) bruto = req.query.linha;
  else if (new URL(req.url, "http://x").searchParams.get("linha") !== null) {
    bruto = new URL(req.url, "http://x").searchParams.get("linha");
  } else if (corpo.linha !== undefined) bruto = corpo.linha;

  const numero = Number(bruto);
  const linha = Number.isInteger(numero) && numero >= PRIMEIRA_LINHA ? numero : null;
  return { corpo, linha };
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  try {
    if (!SPREADSHEET_ID) {
      throw new Error("Variavel GOOGLE_SPREADSHEET_ID_CLIENTES nao configurada.");
    }

    const token = await getAccessToken();
    const base = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`;
    const propriedadesAba = await localizarAba(token, base);
    const aba = abaFormatada(propriedadesAba.title);

    // ================= GET =================
    if (req.method === "GET") {
      const clientes = await lerClientes(token, base, aba);
      res.status(200).json({ clientes });
      return;
    }

    // ================= POST (novo cliente) =================
    if (req.method === "POST") {
      const corpo = req.body || {};
      const dono = String(corpo.dono || "").trim();

      if (!dono) {
        res.status(400).json({ erro: "O nome do dono(a) e obrigatorio." });
        return;
      }

      const valores = [
        [
          dono,
          String(corpo.animal || ""),
          String(corpo.cell || ""),
          String(corpo.endereco || ""),
          String(corpo.imagem || ""),
        ],
      ];

      const url = `${base}/values/${codificarRange(`${aba}!A:E`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
      await chamarSheets(token, url, {
        method: "POST",
        body: JSON.stringify({ values: valores }),
      });

      res.status(201).json({ ok: true, cliente: corpo });
      return;
    }

    // ================= PATCH (editar) =================
    if (req.method === "PATCH") {
      const { corpo, linha } = extrairLinha(req);
      if (!linha) {
        res.status(400).json({ erro: "Linha invalida para edicao." });
        return;
      }

      // Le a linha atual para preservar colunas nao enviadas
      const urlAtual = `${base}/values/${codificarRange(`${aba}!A${linha}:E${linha}`)}?majorDimension=ROWS`;
      const dadosAtuais = await chamarSheets(token, urlAtual);
      const linhaAtual = (dadosAtuais.values || [])[0] || [];
      const atual = (indice) => (linhaAtual[indice] === undefined ? "" : String(linhaAtual[indice]));

      const valores = [
        [
          corpo.dono !== undefined ? String(corpo.dono) : atual(0),
          corpo.animal !== undefined ? String(corpo.animal) : atual(1),
          corpo.cell !== undefined ? String(corpo.cell) : atual(2),
          corpo.endereco !== undefined ? String(corpo.endereco) : atual(3),
          corpo.imagem !== undefined ? String(corpo.imagem) : atual(4),
        ],
      ];

      const url = `${base}/values/${codificarRange(`${aba}!A${linha}:E${linha}`)}?valueInputOption=RAW`;
      await chamarSheets(token, url, {
        method: "PUT",
        body: JSON.stringify({ values: valores }),
      });

      res.status(200).json({ ok: true, linha });
      return;
    }

    // ================= DELETE (apagar) =================
    if (req.method === "DELETE") {
      const { linha } = extrairLinha(req);
      if (!linha) {
        res.status(400).json({ erro: "Linha invalida para exclusao." });
        return;
      }

      await chamarSheets(token, `${base}:batchUpdate`, {
        method: "POST",
        body: JSON.stringify({
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: propriedadesAba.sheetId,
                  dimension: "ROWS",
                  startIndex: linha - 1,
                  endIndex: linha,
                },
              },
            },
          ],
        }),
      });

      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ erro: "Metodo nao permitido." });
  } catch (erro) {
    res.status(500).json({ erro: erro.message || "Erro inesperado." });
  }
};