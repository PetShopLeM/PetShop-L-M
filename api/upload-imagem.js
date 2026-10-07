// ==========================================
// UPLOAD DE IMAGEM → SUPABASE STORAGE
// ==========================================
// ⚠️ PREENCHA OS 3 CAMPOS ABAIXO (Painel do Supabase → Settings → API)
//
// 1) Project URL: parece com https://abcdefg.supabase.co
// 2) service_role key (api_service_role): chave LONGA que começa com "eyJ..."
// 3) Nome do bucket: o seu é "fotos-petshop"

const SUPABASE_URL_FIXO = "https://pxgnqohcdnophaawfxyp.supabase.co";
const SUPABASE_SERVICE_KEY_FIXA = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4Z25xb2hjZG5vcGhhYXdmeHlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDM3MzEzNCwiZXhwIjoyMTA1OTQ5MTM0fQ.JVMIaoXdJp9PDt69PP_6fykFCR9wen9omMriaB6bghA";
const SUPABASE_BUCKET_FIXO = "imagens";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ erro: "Método não permitido." });
  }

  // Usa as variáveis do .env.local se existirem;
  // senão, usa os valores fixos colados acima
  const SUPABASE_URL = process.env.SUPABASE_URL || SUPABASE_URL_FIXO;
  const SUPABASE_SERVICE_KEY =
    process.env.SUPABASE_SERVICE_KEY || SUPABASE_SERVICE_KEY_FIXA;
  const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || SUPABASE_BUCKET_FIXO;

  // Avisa exatamente o que falta, sem mensagem genérica
  if (!SUPABASE_URL || SUPABASE_URL.includes("SEUPROJETO")) {
    return res.status(500).json({
      erro: "Abra api/upload-imagem.js e cole a URL do seu projeto do Supabase na linha 10.",
    });
  }
  if (!SUPABASE_SERVICE_KEY || SUPABASE_SERVICE_KEY.startsWith("eyJCole")) {
    return res.status(500).json({
      erro: "Abra api/upload-imagem.js e cole a service_role key na linha 11.",
    });
  }

  try {
    const { imagem } = req.body || {};

    if (!imagem || typeof imagem !== "string" || !imagem.startsWith("data:")) {
      return res.status(400).json({ erro: "Imagem não recebida ou inválida." });
    }

    // Formato esperado: "data:image/jpeg;base64,/9j/4AA..."
    const partes = imagem.match(/^data:([^;]+);base64,(.*)$/);
    if (!partes) {
      return res.status(400).json({ erro: "Formato de imagem inválido." });
    }

    const tipoArquivo = partes[1] || "image/jpeg";
    const buffer = Buffer.from(partes[2], "base64");
    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ erro: "Imagem vazia." });
    }

    // Nome único para nunca substituir outra foto
    const extensao = tipoArquivo.includes("png")
      ? "png"
      : tipoArquivo.includes("webp")
        ? "webp"
        : "jpg";
    const nomeArquivo = `agendamentos/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}.${extensao}`;

    // Envia para o Supabase Storage
    const respostaUpload = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${nomeArquivo}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          "Content-Type": tipoArquivo,
          "x-upsert": "true",
        },
        body: buffer,
      }
    );

    if (!respostaUpload.ok) {
      const detalhe = await respostaUpload.text().catch(() => "");
      console.error("Erro do Supabase:", respostaUpload.status, detalhe);
      return res.status(500).json({
        erro: `O Supabase recusou o upload (código ${respostaUpload.status}). Confira se o bucket "${SUPABASE_BUCKET}" existe no painel.`,
      });
    }

    // Link público da foto (o bucket precisa estar público)
    const urlPublica = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${nomeArquivo}`;

    return res.status(200).json({ url: urlPublica });
  } catch (erro) {
    console.error("Erro no upload:", erro);
    return res.status(500).json({ erro: "Falha inesperada ao salvar a imagem." });
  }
}