// Rota temporária de diagnóstico — pode apagar depois
export default function handler(_req, res) {
  res.status(200).json({
    SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
    SUPABASE_SERVICE_KEY: Boolean(process.env.SUPABASE_SERVICE_KEY),
    SUPABASE_BUCKET: process.env.SUPABASE_BUCKET || "",
  });
}