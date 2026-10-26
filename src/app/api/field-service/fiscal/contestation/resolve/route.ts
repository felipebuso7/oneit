import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { readLimitedBody } from "@/lib/http/limited-body";
import { hasSameOrigin } from "@/lib/http/same-origin";

const schema = z.object({ contestationId: z.string().uuid(), decision: z.enum(["ACCEPTED", "REJECTED"]), resolution: z.string().trim().min(10).max(4000) });
const reply = (status: number, code: string) => Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED"); if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED"); const raw = await readLimitedBody(request, 16 * 1024); if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE"); let input: unknown; try { input = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = schema.safeParse(input); if (!parsed.success) return reply(400, "INVALID_CONTESTATION_RESOLUTION"); const supabase = await createClient(); const { data: auth, error: authError } = await supabase.auth.getUser(); if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");
  const { data: contestation, error: readError } = await supabase.from("measurement_contestations").select("id,organization_id,billing_period_id,measurement_sheet_id,status").eq("id", parsed.data.contestationId).maybeSingle(); if (readError) return reply(503, "CONTESTATION_UNAVAILABLE"); if (!contestation) return reply(404, "CONTESTATION_NOT_FOUND");
  const { data: updatedContestation, error: updateError } = await supabase.from("measurement_contestations").update({ status: "RESOLVED", resolution: parsed.data.resolution, resolved_at: new Date().toISOString(), resolved_by: auth.user.id }).eq("id", contestation.id).eq("status", "OPEN").select("id").maybeSingle(); if (updateError) return reply(503, "CONTESTATION_RESOLUTION_UNAVAILABLE"); if (!updatedContestation) return reply(409, "CONTESTATION_ALREADY_RESOLVED");
  const nextPeriodStatus = parsed.data.decision === "ACCEPTED" ? "CONTESTED" : "APPROVED";
  const { data: updatedPeriod, error: periodUpdateError } = await supabase.from("billing_periods").update({ status: nextPeriodStatus }).eq("id", contestation.billing_period_id).eq("status", "SENT_FOR_CONTESTATION").select("id").maybeSingle();
  if (periodUpdateError) return reply(503, "BILLING_PERIOD_UPDATE_UNAVAILABLE");
  if (!updatedPeriod) return reply(409, "BILLING_PERIOD_TRANSITION_CONFLICT");
  return Response.json({ contestationId: contestation.id, decision: parsed.data.decision, resolvedBy: auth.user.id }, { headers: { "Cache-Control": "no-store" } });
}
