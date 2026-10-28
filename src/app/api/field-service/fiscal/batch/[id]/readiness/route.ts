import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { validateBillingLineReadiness } from "@/lib/field-service/billing-readiness";
import { billingTotalsMatch } from "@/lib/field-service/billing-total";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!z.string().uuid().safeParse(id).success) return Response.json({ code: "INVALID_BATCH_ID" }, { status: 400 });
  const supabase = await createClient(); const { data: auth, error: authError } = await supabase.auth.getUser(); if (authError || !auth.user) return Response.json({ code: "AUTH_REQUIRED" }, { status: 401 });
  const { data: batch, error: batchError } = await supabase.from("fiscal_batches").select("id,organization_id,batch_number,status,measurement_sheet_ids,total_amount").eq("id", id).maybeSingle(); if (batchError) return Response.json({ code: "FISCAL_BATCH_UNAVAILABLE" }, { status: 503 }); if (!batch) return Response.json({ code: "FISCAL_BATCH_NOT_FOUND" }, { status: 404 });
  const { data: role, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", auth.user.id).eq("organization_id", batch.organization_id).in("role", ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER", "FINANCE"]).limit(1).maybeSingle();
  if (roleError) return Response.json({ code: "FISCAL_BATCH_AUTHORIZATION_UNAVAILABLE" }, { status: 503 }); if (!role) return Response.json({ code: "FISCAL_BATCH_NOT_AUTHORIZED" }, { status: 403 });
  const { data: lines, error } = await supabase.from("measurement_sheet_lines").select("ticket_number,description,quantity,unit_price,total_price,service_date,service_location").in("measurement_sheet_id", batch.measurement_sheet_ids ?? []); if (error) return Response.json({ code: "MEASUREMENT_LINES_UNAVAILABLE" }, { status: 503 });
  const incomplete = (lines ?? []).map((line) => ({ ticket: line.ticket_number, missing: validateBillingLineReadiness(line).missing })).filter((item) => item.missing.length);
  const totalMismatch = !billingTotalsMatch(Number(batch.total_amount), (lines ?? []).map((line) => Number(line.total_price)));
  return Response.json({ batch: { id: batch.id, number: batch.batch_number, status: batch.status }, ready: incomplete.length === 0 && !totalMismatch, lineCount: lines?.length ?? 0, incomplete, totalMismatch }, { headers: { "Cache-Control": "private, no-store" } });
}
