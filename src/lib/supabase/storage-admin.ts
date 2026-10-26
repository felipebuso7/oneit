import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getPublicEnvironment } from "@/lib/env";

export function createStorageAdmin(bucket: "ticket-evidences" | "ticket-reports" = "ticket-evidences") {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Upload de evidências ainda não configurado.");
  return createClient(getPublicEnvironment().NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).storage.from(bucket);
}
