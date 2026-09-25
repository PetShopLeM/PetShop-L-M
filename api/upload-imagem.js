require("dotenv").config({ path: ".env.local" });

// Recebe a imagem do painel e salva no Supabase Storage,
// devolvendo o link público para gravar na coluna Imagem.

function converterEmBuffer(dataUrl) {
  const texto = String(dataUrl || "");
  const match = texto.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (!match) {
    throw new Error("Formato de imagem invalido.");
  }

  const tipo = `image/${match[1]}`;
  const buffer = Buffer.from(match[2], "base64");

  if (!buffer.length) {
    throw new Error("Imagem vazia.");
  }

  return { tipo, buffer };
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ erro: "Metodo nao permitido." });
    return;
  }

  try {
    const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
    const SUPABASE_CHAVE = process.env.SUPABASE_CHAVE || "";

    if (!SUPABASE_URL || !SUPABASE_CHAVE) {
      throw new Error("Variaveis SUPABASE_URL / SUPABASE_CHAVE nao configuradas no .env.local.");
    }

    const corpo =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

    const { tipo, buffer } = converterEmBuffer(corpo.imagem);

    if (buffer.length > 4 * 1024 * 1024) {
      throw new Error("Imagem muito grande. Tente uma foto menor.");
    }

    const nomeArquivo = `servico-${Date.now()}.${tipo === "image/png" ? "png" : "jpg"}`;

    const resposta = await fetch(
      `${SUPABASE_URL}/storage/v1/object/imagens/${nomeArquivo}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_CHAVE}`,
          "Content-Type": tipo,
        },
        body: buffer,
      }
    );

    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      throw new Error(dados?.message || `Falha ao salvar imagem (${resposta.status}).`);
    }

    res.status(200).json({
      ok: true,
      url: `${SUPABASE_URL}/storage/v1/object/public/imagens/${nomeArquivo}`,
    });
  } catch (erro) {
    res.status(500).json({ erro: erro.message || "Erro inesperado." });
  }
};