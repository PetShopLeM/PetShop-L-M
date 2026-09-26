require("dotenv").config({ path: ".env.local" });

// Credenciais do Supabase (Painel -> Settings -> API)
const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "fotos-petshop";

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

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(500).json({
        erro:
          "Configure SUPABASE_URL e SUPABASE_SERVICE_KEY no arquivo .env.local.",
      });
    }

    const corpo =
      typeof req.body === "string"
        ? JSON.parse(req.body || "{}")
        : req.body || {};

    // Espera uma imagem no formato "data:image/jpeg;base64,..."
    const combinacao = String(corpo.imagem || "").match(
      /^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/
    );

    if (!combinacao) {
      return res.status(400).json({ erro: "Imagem invalida." });
    }

    const extensao = combinacao[1] === "jpeg" ? "jpg" : combinacao[1];
    const conteudo = Buffer.from(combinacao[2], "base64");

    // Nome único para nunca sobrescrever imagens antigas
    const nomeArquivo = `imagens/${Date.now()}-${Math.round(
      Math.random() * 1000000000
    )}.${extensao}`;

    // Envia para o Supabase Storage
    const resposta = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${nomeArquivo}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          "Content-Type": `image/${combinacao[1]}`,
          "x-upsert": "true",
        },
        body: conteudo,
      }
    );

    if (!resposta.ok) {
      const texto = await resposta.text();
      throw new Error(
        `Supabase respondeu ${resposta.status}: ${texto.slice(0, 150)}`
      );
    }

    // Link público da imagem
    const url = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${nomeArquivo}`;

    return res.status(200).json({ ok: true, url });
  } catch (erro) {
    return res.status(500).json({ erro: String(erro?.message || erro) });
  }
};