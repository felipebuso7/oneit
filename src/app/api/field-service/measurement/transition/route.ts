import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { readLimitedBody } from "@/lib/http/limited-body";
import { hasSameOrigin } from "@/lib/http/same-origin";

const schema = z.object({
  sheetId: z.string().uuid(),
  targetStatus: z.enum(["READY_FOR_REVIEW", "SENT_FOR_CONTESTATION", "APPROVED", "SENT_TO_TAX", "RETURNED_FOR_CORRECTION", "SENT_TO_BILLING", "CLOSED"]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

function reply(status: number, code: string) { return Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } }); }

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED");
  const raw = await readLimitedBody(request, 16 * 1024);
  if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE");
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = schema.safeParse(input);
  if (!parsed.success) return reply(400, "INVALID_MEASUREMENT_TRANSITION");
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");
  const { data, error } = await supabase.rpc("transition_measurement_sheet", {
    target_sheet_id: parsed.data.sheetId,
    target_status: parsed.data.targetStatus,
    target_actor: auth.user.id,
    target_metadata: parsed.data.metadata ?? {},
  });
  if (error) {
    if (error.message.includes("measurement_sheet_not_found")) return reply(404, "MEASUREMENT_NOT_FOUND");
    if (error.message.includes("forbidden")) return reply(403, "MEASUREMENT_NOT_AUTHORIZED");
    if (error.message.includes("invalid_measurement_transition")) return reply(409, "INVALID_MEASUREMENT_STATE");
    if (error.message.includes("measurement_final_email_not_confirmed")) return reply(409, "FINAL_EMAIL_NOT_CONFIRMED");
    return reply(503, "MEASUREMENT_TRANSITION_UNAVAILABLE");
  }
  return Response.json({ measurementSheet: data }, { headers: { "Cache-Control": "no-store" } });
}
