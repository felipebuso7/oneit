import { createClient } from "@/lib/supabase/server";
import { hasSameOrigin } from "@/lib/http/same-origin";
import { readLimitedBody } from "@/lib/http/limited-body";
import { z } from "zod";

const schema = z.object({
  queueId: z.string().uuid(),
  decision: z.enum(["APPROVE", "RETURN"]),
  reason: z.string().trim().min(10).max(2000),
});

function reply(status: number, code: string) {
  return Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED");
  const raw = await readLimitedBody(request, 16 * 1024);
  if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE");
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return reply(400, "INVALID_REVIEW");
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");
  const { data, error } = await supabase.rpc("review_field_service_order", {
    target_queue_id: parsed.data.queueId,
    target_decision: parsed.data.decision,
    target_reason: parsed.data.reason,
  });
  if (error) {
    if (error.message.includes("FIELD_REVIEW_NOT_FOUND")) return reply(404, "REVIEW_NOT_FOUND");
    if (error.message.includes("FIELD_REVIEW_NOT_AUTHORIZED")) return reply(403, "REVIEW_NOT_AUTHORIZED");
    if (error.message.includes("FIELD_REVIEW_INVALID_STATE")) return reply(409, "INVALID_REVIEW_STATE");
    if (error.message.includes("FIELD_REVIEW_REASON_REQUIRED") || error.message.includes("FIELD_REVIEW_INVALID_DECISION")) return reply(422, "INVALID_REVIEW");
    return reply(503, "REVIEW_UNAVAILABLE");
  }
  return Response.json({ reviewId: data }, { headers: { "Cache-Control": "no-store" } });
}
