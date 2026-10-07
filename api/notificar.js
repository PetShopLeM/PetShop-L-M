require("dotenv").config({ path: ".env.local" });

// Número que vai RECEBER o aviso (seu celular, com DDI+DDD, só números)
const TELEFONE = process.env.CALLMEBOT_PHONE || "5511970264824";
// Chave que a CallMeBot te passa no WhatsApp (Passo 2)
const CHAVE = process.env.CALLMEBOT_APIKEY || "SUA_CHAVE_AQUI";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ erro: "Metodo nao permitido." });
  }

  const corpo =
    typeof req.body === "string"
      ? JSON.parse(req.body || "{}")
      : req.body || {};

  const mensagem = String(corpo.mensagem || "").trim();

  if (!mensagem) {
    return res.status(400).json({ erro: "Informe a mensagem." });
  }

  if (!CHAVE || CHAVE === "SUA_CHAVE_AQUI") {
    return res
      .status(200)
      .json({ ok: false, aviso: "Chave da CallMeBot nao configurada." });
  }

  const url =
    "https://api.callmebot.com/whatsapp.php" +
    "?phone=%2B" + TELEFONE.replace(/\D/g, "") +
    "&text=" + encodeURIComponent(mensagem) +
    "&apikey=" + encodeURIComponent(CHAVE);

  const resposta = await fetch(url);

  if (!resposta.ok) {
    return res.status(500).json({ erro: "CallMeBot respondeu " + resposta.status });
  }

  return res.status(200).json({ ok: true });
};