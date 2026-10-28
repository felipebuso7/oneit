import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const organizationId = new URL(request.url).searchParams.get("organizationId"); if (!organizationId || !z.string().uuid().safeParse(organizationId).success) return Response.json({ code: "ORGANIZATION_REQUIRED" }, { status: 400 });
  const supabase = await createClient(); const { data: auth, error: authError } = await supabase.auth.getUser(); if (authError || !auth.user) return Response.json({ code: "AUTH_REQUIRED" }, { status: 401 });
  const { data: role, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", auth.user.id).eq("organization_id", organizationId).in("role", ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER", "FINANCE"]).limit(1).maybeSingle();
  if (roleError) return Response.json({ code: "FISCAL_HISTORY_AUTHORIZATION_UNAVAILABLE" }, { status: 503 }); if (!role) return Response.json({ code: "FISCAL_HISTORY_NOT_AUTHORIZED" }, { status: 403 });
  const [{ data: periods, error: periodsError }, { data: batches, error: batchesError }] = await Promise.all([
    supabase.from("billing_periods").select("id,competence,status,contestation_deadline,closed_at,updated_at").eq("organization_id", organizationId).order("competence", { ascending: false }).limit(36),
    supabase.from("fiscal_batches").select("id,competence,batch_number,status,total_amount,sent_at,closed_at,created_at").eq("organization_id", organizationId).order("competence", { ascending: false }).limit(36),
  ]);
  if (periodsError || batchesError) return Response.json({ code: "FISCAL_HISTORY_UNAVAILABLE" }, { status: 503 });
  return Response.json({ periods: periods ?? [], batches: batches ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}
