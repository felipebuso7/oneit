import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams; const organizationId = params.get("organizationId"); const billingPeriodId = params.get("billingPeriodId");
  if ((!organizationId || !z.string().uuid().safeParse(organizationId).success) && (!billingPeriodId || !z.string().uuid().safeParse(billingPeriodId).success)) return Response.json({ code: "PERIOD_OR_ORGANIZATION_REQUIRED" }, { status: 400 });
  const supabase = await createClient(); const { data: auth, error: authError } = await supabase.auth.getUser(); if (authError || !auth.user) return Response.json({ code: "AUTH_REQUIRED" }, { status: 401 });
  let query = supabase.from("measurement_contestations").select("id,billing_period_id,measurement_sheet_id,organization_id,opened_at,deadline_at,resolved_at,resolved_by,resolution,status").order("opened_at", { ascending: false }).limit(200);
  query = billingPeriodId ? query.eq("billing_period_id", billingPeriodId) : query.eq("organization_id", organizationId as string);
  const { data, error } = await query; if (error) return Response.json({ code: "CONTESTATIONS_UNAVAILABLE" }, { status: 503 }); return Response.json({ contestations: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}
