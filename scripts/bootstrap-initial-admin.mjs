import { createClient } from "@supabase/supabase-js";

function readArgument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1]?.trim() : undefined;
}

function fail(message) {
  console.error(`Bootstrap interrompido: ${message}`);
  process.exit(1);
}

const email = readArgument("email")?.toLowerCase();
const fullName = readArgument("name");
const legalName = readArgument("legal-name");
const displayName = readArgument("display-name");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.ONEIT_INITIAL_ADMIN_PASSWORD;

if (!url || !serviceRoleKey) fail("configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente seguro.");
if (!email || !fullName || !legalName || !displayName) fail("informe --email, --name, --legal-name e --display-name.");
if (!password || password.length < 12) fail("defina ONEIT_INITIAL_ADMIN_PASSWORD com pelo menos 12 caracteres; não passe a senha na linha de comando.");

const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: existingProfiles, error: profileError } = await supabase.from("user_profiles").select("id").eq("email", email).limit(1);
if (profileError) fail("não foi possível verificar perfis existentes.");
if (existingProfiles?.length) fail("já existe perfil para este e-mail; o bootstrap não será repetido.");

const { data: existingOrganizations, error: organizationError } = await supabase.from("organizations").select("id").eq("legal_name", legalName).limit(1);
if (organizationError) fail("não foi possível verificar organizações existentes.");
if (existingOrganizations?.length) fail("já existe organização com esta razão social; o bootstrap não será repetido.");

const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName },
});
if (createUserError || !createdUser.user) fail("não foi possível criar a identidade inicial no Auth.");

const { data: organizationId, error: bootstrapError } = await supabase.rpc("bootstrap_organization", {
  target_user_id: createdUser.user.id,
  target_email: email,
  target_full_name: fullName,
  organization_legal_name: legalName,
  organization_display_name: displayName,
});
if (bootstrapError) {
  console.error("A identidade foi criada, mas o bootstrap da organização falhou. Não execute novamente sem investigar; pode ser necessário remover a identidade criada no Supabase Auth.");
  fail("falha ao criar organização e perfil administrativo.");
}

console.log(JSON.stringify({ status: "ok", organizationId, administratorId: createdUser.user.id, email }, null, 2));
