require("dotenv").config({ path: ".env.local" });
const crypto = require("crypto");

// ==========================================
// CONFIGURAÇÃO
// ==========================================
const SPREADSHEET_ID =
  process.env.GOOGLE_SPREADSHEET_ID_AGENDAMENTOS ||
  process.env.GOOGLE_SPREADSHEET_ID_ESTOQUE ||
  "";

const SHEET_NAME = process.env.GOOGLE_SHEET_NAME_AGENDAMENTOS || "Agendamentos";

// Ordem das colunas na planilha (aba Agendamentos):
// A Data | B Dono | C Endereço | D Cell | E Serviço
// F Horário | G Valor | H Transporte | I Aniversário | J Imagem

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

function abaFormatada(titulo) {
  return `'${String(titulo).replace(/'/g, "''")}'`;
}

function codificarRange(range) {
  return encodeURIComponent(range)
    .replace(/%27/g, "'")
    .replace(/%21/g, "!")
    .replace(/%20/g, " ");
}

// ==========================================
// AUTENTICAÇÃO NO GOOGLE
// ==========================================
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

// ==========================================
// HELPERS DA API DO GOOGLE SHEETS
// ==========================================
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
  } catch (e) {
    dados = null;
  }

  if (!resposta.ok) {
    const mensagem =
      (dados && (dados.error?.message || dados.error_description || dados.error)) ||
      texto ||
      `Google respondeu ${resposta.status}`;
    throw new Error(`Google respondeu ${resposta.status}: ${String(mensagem).slice(0, 200)}`);
  }

  return dados || {};
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
      .filter(Boolean)
      .join(", ");
    throw new Error(
      `Aba "${SHEET_NAME}" nao encontrada. Abas disponiveis: ${disponiveis || "nenhuma"}.`
    );
  }

  return aba.properties.title;
}

// Monta a linha com as 10 colunas (A até J), sempre nessa ordem
function montarLinha(corpo) {
  const c = corpo || {};
  return [
    String(c.data || ""),
    String(c.dono || ""),
    String(c.endereco || ""),
    String(c.cell || ""),
    String(c.servico || ""),
    String(c.horario || ""),
    String(c.valor || ""),
    String(c.transporte || ""),
    String(c.aniversario || ""),
    String(c.imagem || ""),
  ];
}

// ==========================================
// HANDLER
// ==========================================
module.exports = async (req, res) => {
  try {
    if (!SPREADSHEET_ID) {
      throw new Error("GOOGLE_SPREADSHEET_ID_AGENDAMENTOS nao configurado.");
    }

    const token = await getAccessToken();
    const base = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`;
    const aba = await localizarAba(token, base);

    // ================= GET (listar) =================
    if (req.method === "GET") {
      const url = `${base}/values/${codificarRange(`${abaFormatada(aba)}!A:J`)}?majorDimension=ROWS`;
      const dados = await chamarSheets(token, url);
      const valores = dados.values || [];

      const agendamentos = valores
        .slice(1) // pula o cabeçalho
        .map((colunas, indice) => ({
          linha: indice + 2,
          data: String(colunas[0] || ""),
          dono: String(colunas[1] || ""),
          endereco: String(colunas[2] || ""),
          cell: String(colunas[3] || ""),
          servico: String(colunas[4] || ""),
          horario: String(colunas[5] || ""),
          valor: String(colunas[6] || ""),
          transporte: String(colunas[7] || ""),
          aniversario: String(colunas[8] || ""),
          imagem: String(colunas[9] || ""),
        }))
        .filter((a) =>
          [a.data, a.dono, a.servico, a.horario].some((v) => v.trim() !== "")
        );

      res.status(200).json(agendamentos);
      return;
    }

    // ================= POST (criar) =================
    if (req.method === "POST") {
      const valores = [montarLinha(req.body)];

      const url =
        `${base}/values/${codificarRange(`${abaFormatada(aba)}!A:J`)}:append` +
        `?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

      await chamarSheets(token, url, {
        method: "POST",
        body: JSON.stringify({ values: valores }),
      });

      res.status(200).json({ ok: true });
      return;
    }

    // ================= PATCH (editar) =================
    if (req.method === "PATCH") {
      const linha = Number(req.query?.linha || req.body?.linha || 0);
      if (!linha || linha < 2) throw new Error("Linha invalida para edicao.");

      const valores = [montarLinha(req.body)];

      const url = `${base}/values/${codificarRange(
        `${abaFormatada(aba)}!A${linha}:J${linha}`
      )}?valueInputOption=USER_ENTERED`;

      await chamarSheets(token, url, {
        method: "PUT",
        body: JSON.stringify({ values: valores }),
      });

      res.status(200).json({ ok: true });
      return;
    }

    // ================= DELETE (apagar) =================
    if (req.method === "DELETE") {
      const linha = Number(req.query?.linha || req.body?.linha || 0);
      if (!linha || linha < 2) throw new Error("Linha invalida para exclusao.");

      const meta = await chamarSheets(token, `${base}?fields=sheets.properties`);
      const abaEncontrada = (meta.sheets || []).find(
        (s) => normalizar(s.properties?.title) === normalizar(SHEET_NAME)
      );
      if (!abaEncontrada) throw new Error(`Aba "${SHEET_NAME}" nao encontrada na planilha.`);

      await chamarSheets(token, `${base}:batchUpdate`, {
        method: "POST",
        body: JSON.stringify({
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: abaEncontrada.properties.sheetId,
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