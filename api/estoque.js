require("dotenv").config({ path: ".env.local" });
const crypto = require("crypto");

const SPREADSHEET_ID =
  process.env.GOOGLE_SPREADSHEET_ID_ESTOQUE || "";

const SHEET_NAME =
  process.env.GOOGLE_SHEET_NAME_ESTOQUE || "Estoque";

function base64url(texto) {
  return Buffer.from(texto, "utf8").toString("base64url");
}

async function getAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || "";
  privateKey = privateKey.replace(/\\n/g, "\n");

  if (!email) {
    throw new Error("Variavel GOOGLE_SERVICE_ACCOUNT_EMAIL nao configurada na Vercel.");
  }
  if (!privateKey) {
    throw new Error("Variavel GOOGLE_PRIVATE_KEY nao configurada na Vercel.");
  }

  const agora = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
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
    .update(`${header}.${payload}`)
    .sign(privateKey);

  const jwt = `${header}.${payload}.${assinatura.toString("base64url")}`;

  const resposta = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const dados = await resposta.json();
  if (!dados.access_token) {
    throw new Error("Falha na autenticacao do Google: " + JSON.stringify(dados));
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
  const dados = await resposta.json();
  if (!resposta.ok) {
    throw new Error(`Google Sheets (${resposta.status}): ${JSON.stringify(dados)}`);
  }
  return dados;
}

function montarProduto(row, numeroLinha) {
  return {
    linha: numeroLinha,
    produto: row[0] || "",
    marca: row[1] || "",
    categoria: row[2] || "",
    quantidade: row[3] || "",
    preco: row[4] || "",
    desconto: row[5] || "",
    percentual: row[6] || "",
    imagem: row[7] || "",
  };
}

async function obterSheetId(token, base) {
  const dados = await chamarSheets(token, base);
  const abas = dados.sheets || [];
  const aba = abas.find((s) => s.properties.title === SHEET_NAME);
  if (!aba) {
    throw new Error(
      `A aba "${SHEET_NAME}" nao existe. Abas encontradas: ${abas
        .map((s) => s.properties.title)
        .join(", ")}`
    );
  }
  return aba.properties.sheetId;
}

module.exports = async function handler(req, res) {
  try {
    const token = await getAccessToken();
    const base = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`;
    const metodo = req.method || "GET";

    if (metodo === "GET") {
      const url = `${base}/values/${encodeURIComponent(`${SHEET_NAME}!A3:H`)}`;
      const dados = await chamarSheets(token, url);
      const linhas = dados.values || [];
      const estoque = linhas
        .map((row, index) => montarProduto(row, index + 3))
        .filter((p) => p.produto.trim() !== "");
      return res.status(200).json(estoque);
    }

    const corpo =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

    if (metodo === "POST") {
      const linha = [
        corpo.produto, corpo.marca, corpo.categoria, corpo.quantidade,
        corpo.preco, corpo.desconto, corpo.percentual, corpo.imagem,
      ].map((v) => String(v ?? ""));
      const url = `${base}/values/${encodeURIComponent(
        `${SHEET_NAME}!A3:H`
      )}/append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
      await chamarSheets(token, url, {
        method: "POST",
        body: JSON.stringify({ values: [linha] }),
      });
      return res.status(200).json({ ok: true });
    }

    if (metodo === "PATCH") {
      const numeroLinha = Number(corpo.linha);
      if (!numeroLinha) {
        return res.status(400).json({ erro: "Informe o numero da linha." });
      }
      const linha = [
        corpo.produto, corpo.marca, corpo.categoria, corpo.quantidade,
        corpo.preco, corpo.desconto, corpo.percentual, corpo.imagem,
      ].map((v) => String(v ?? ""));
      const url = `${base}/values/${encodeURIComponent(
        `${SHEET_NAME}!A${numeroLinha}:H${numeroLinha}`
      )}?valueInputOption=USER_ENTERED`;
      await chamarSheets(token, url, {
        method: "PUT",
        body: JSON.stringify({ values: [linha] }),
      });
      return res.status(200).json({ ok: true });
    }

    if (metodo === "DELETE") {
  const numeroLinha = Number(
    corpo.linha || req.query?.linha
  );
      if (!numeroLinha) {
        return res.status(400).json({ erro: "Informe o numero da linha." });
      }
      const sheetId = await obterSheetId(token, base);
      await chamarSheets(token, `${base}/batchUpdate`, {
        method: "POST",
        body: JSON.stringify({
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: "ROWS",
                  startIndex: numeroLinha - 1,
                  endIndex: numeroLinha,
                },
              },
            },
          ],
        }),
      });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ erro: "Metodo nao permitido." });
  } catch (erro) {
    return res.status(500).json({ erro: String(erro?.message || erro) });
  }
};