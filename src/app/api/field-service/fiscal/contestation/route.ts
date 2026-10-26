import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { readLimitedBody } from "@/lib/http/limited-body";
import { hasSameOrigin } from "@/lib/http/same-origin";

const schema = z.object({ organizationId: z.string().uuid(), billingPeriodId: z.string().uuid(), measurementSheetId: z.string().uuid(), note: z.string().trim().min(10).max(4000) });
const reply = (status: number, code: string) => Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED"); if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED"); const raw = await readLimitedBody(request, 16 * 1024); if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE"); let input: unknown; try { input = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = schema.safeParse(input); if (!parsed.success) return reply(400, "INVALID_CONTESTATION"); const supabase = await createClient(); const { data: auth, error: authError } = await supabase.auth.getUser(); if (authError || !auth.user) return reply(401, "AUTH_REQUIRED"); const value = parsed.data;
  const { data: period, error: periodError } = await supabase.from("billing_periods").select("status,contestation_deadline").eq("id", value.billingPeriodId).eq("organization_id", value.organizationId).maybeSingle(); if (periodError) return reply(503, "BILLING_PERIOD_UNAVAILABLE"); if (!period) return reply(404, "BILLING_PERIOD_NOT_FOUND"); if (period.status !== "SENT_FOR_CONTESTATION" && period.status !== "CONTESTED") return reply(409, "CONTESTATION_PERIOD_CLOSED"); if (period.contestation_deadline && new Date(period.contestation_deadline).getTime() < Date.now()) return reply(409, "CONTESTATION_DEADLINE_EXPIRED");
  const { data, error } = await supabase.from("measurement_contestations").insert({ billing_period_id: value.billingPeriodId, measurement_sheet_id: value.measurementSheetId, organization_id: value.organizationId, deadline_at: period.contestation_deadline ?? new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), resolution: value.note, status: "OPEN" }).select("id,billing_period_id,measurement_sheet_id,deadline_at,status,opened_at").single();
  if (error) return reply(error.code === "23505" ? 409 : 503, error.code === "23505" ? "CONTESTATION_ALREADY_EXISTS" : "CONTESTATION_SAVE_UNAVAILABLE");
  return Response.json({ contestation: data, openedBy: auth.user.id }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
