import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getPublicEnvironment } from "@/lib/env";
export function createAuthAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Provisionamento de usuários não configurado.");
  return createClient(getPublicEnvironment().NEXT_PUBLIC_SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
