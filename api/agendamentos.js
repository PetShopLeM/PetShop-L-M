require("dotenv").config({ path: ".env.local" });
const crypto = require("crypto");

const SPREADSHEET_ID =
  process.env.GOOGLE_SPREADSHEET_ID_AGENDAMENTOS ||
  process.env.GOOGLE_SPREADSHEET_ID_ESTOQUE ||
  "";

const SHEET_NAME = process.env.GOOGLE_SHEET_NAME_AGENDAMENTOS || "Agendamentos";

function base64url(texto) {
  return Buffer.from(texto, "utf8").toString("base64url");
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

function abaFormatada() {
  return `'${SHEET_NAME.replace(/'/g, "''")}'`;
}

function codificarRange(range) {
  return encodeURIComponent(range)
    .replace(/%27/g, "'")
    .replace(/%21/g, "!")
    .replace(/%20/g, " ");
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
      throw new Error("Variavel GOOGLE_SPREADSHEET_ID_AGENDAMENTOS nao configurada.");
    }

    const token = await getAccessToken();
    const base = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`;
    const aba = abaFormatada();

    // ================= GET (LER - colunas A:H) =================
    if (req.method === "GET") {
      const url = `${base}/values/${codificarRange(`${aba}!A:I`)}?majorDimension=ROWS`;
      const dados = await chamarSheets(token, url);
      const linhas = dados.values || [];

      const agendamentos = [];
      for (let i = 1; i < linhas.length; i++) {
        const vazia = linhas[i].every((c) => !String(c || "").trim());
        if (vazia) continue;

        const [data, dono, endereco, cell, servico, horario, valor, transporte, aniversario] = linhas[i];
        agendamentos.push({
          linha: i + 1,
          data: data || "",
          dono: dono || "",
          endereco: endereco || "",
          cell: cell || "",
          servico: servico || "",
          horario: horario || "",
          valor: valor || "",
          transporte: transporte || "",
          aniversario: aniversario || "",
        });
      }

      res.status(200).json(agendamentos);
      return;
    }

    // ================= POST (CRIAR - colunas A:H) =================
    if (req.method === "POST") {
      const b = req.body || {};
      const valores = [[
        String(b.data || ""),
        String(b.dono || ""),
        String(b.endereco || ""),
        String(b.cell || ""),
        String(b.servico || ""),
        String(b.horario || ""),
        String(b.valor || ""),
        String(b.transporte || ""),
        String(b.aniversario || ""),
      ]];

      const url =
        `${base}/values/${codificarRange(`${aba}!A:H`)}:append` +
        `?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

      await chamarSheets(token, url, {
        method: "POST",
        body: JSON.stringify({ values: valores }),
      });

      res.status(200).json({ ok: true });
      return;
    }

    // ================= PATCH (EDITAR LINHA - colunas A:H) =================
    if (req.method === "PATCH") {
      const b = req.body || {};
      const linha = Number(b.linha || req.query.linha);
      if (!linha || linha < 2) throw new Error("Linha invalida para edicao.");

      const valores = [[
        String(b.data || ""),
        String(b.dono || ""),
        String(b.endereco || ""),
        String(b.cell || ""),
        String(b.servico || ""),
        String(b.horario || ""),
        String(b.valor || ""),
        String(b.transporte || ""),
        String(b.aniversario || ""),
      ]];

      const url = `${base}/values/${codificarRange(
        `${aba}!A${linha}:H${linha}`
      )}?valueInputOption=USER_ENTERED`;

      await chamarSheets(token, url, {
        method: "PUT",
        body: JSON.stringify({ values: valores }),
      });

      res.status(200).json({ ok: true });
      return;
    }

    // ================= DELETE (APAGAR LINHA) =================
    if (req.method === "DELETE") {
      const linha = Number(req.query.linha);
      if (!linha || linha < 2) throw new Error("Linha invalida para exclusao.");

      const meta = await chamarSheets(token, `${base}?fields=sheets.properties`);
      const abaEncontrada = (meta.sheets || []).find(
        (s) => s.properties.title === SHEET_NAME
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