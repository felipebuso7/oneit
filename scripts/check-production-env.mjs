const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "ONEIT_APP_URL",
  "ONEIT_DEPLOYMENT_MODE",
];

const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  console.error(`Variáveis obrigatórias ausentes: ${missing.join(", ")}`);
  process.exit(1);
}

try {
  const appUrl = new URL(process.env.ONEIT_APP_URL);
  if (appUrl.protocol !== "https:") throw new Error("protocolo");
} catch {
  console.error("ONEIT_APP_URL deve ser uma URL HTTPS válida.");
  process.exit(1);
}

if (!["supabase", "self_hosted"].includes(process.env.ONEIT_DEPLOYMENT_MODE)) {
  console.error("ONEIT_DEPLOYMENT_MODE deve ser supabase ou self_hosted.");
  process.exit(1);
}

if (process.env.ONEIT_DEPLOYMENT_MODE === "supabase" && !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
  console.error("SUPABASE_SERVICE_ROLE_KEY ausente; upload de evidências, RTO e provisionamento ficarão indisponíveis.");
  process.exit(1);
}

console.log("Configuração mínima de produção validada.");
