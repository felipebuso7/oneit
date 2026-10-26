import { createClient } from "@/lib/supabase/server";
import { readLimitedBody } from "@/lib/http/limited-body";
import { hasSameOrigin } from "@/lib/http/same-origin";
import { ticketReviewSchema } from "@/lib/validation/ticket-review";

function reply(status: number, code: string) {
  return Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED");
  const raw = await readLimitedBody(request, 16 * 1024);
  if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE");
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = ticketReviewSchema.safeParse(input);
  if (!parsed.success) return reply(400, "INVALID_REVIEW");
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");
  const review = parsed.data;
  const { data, error } = await supabase.rpc("review_ticket", {
    target_ticket_id: review.ticketId,
    expected_version: review.expectedVersion,
    target_decision: review.decision,
    target_reason: review.reason,
  });
  if (error) {
    if (error.message.includes("REVIEW_VERSION_CONFLICT")) return reply(409, "VERSION_CONFLICT");
    if (error.message.includes("REVIEW_INVALID_STATE")) return reply(409, "INVALID_REVIEW_STATE");
    if (error.message.includes("REVIEW_NOT_AUTHORIZED") || error.message.includes("REVIEW_SELF_APPROVAL_FORBIDDEN")) return reply(403, "REVIEW_NOT_AUTHORIZED");
    if (error.message.includes("REVIEW_COMPLETION_REQUIRED") || error.message.includes("REVIEW_INVALID_DECISION")) return reply(422, "REVIEW_NOT_READY");
    return reply(503, "REVIEW_UNAVAILABLE");
  }
  return Response.json({ reviewId: data }, { headers: { "Cache-Control": "no-store" } });
}
