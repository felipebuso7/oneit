import { createClient } from "@/lib/supabase/server";
import { readLimitedBody } from "@/lib/http/limited-body";
import { hasSameOrigin } from "@/lib/http/same-origin";
import { ticketClosureSchema } from "@/lib/validation/ticket-closure";

function reply(status: number, code: string) {
  return Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED");
  const raw = await readLimitedBody(request, 24 * 1024);
  if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE");
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = ticketClosureSchema.safeParse(input);
  if (!parsed.success) return reply(400, "INVALID_CLOSURE");
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");
  const closure = parsed.data;
  const { data, error } = await supabase.rpc("close_ticket", {
    target_ticket_id: closure.ticketId,
    expected_version: closure.expectedVersion,
    target_report_id: closure.reportId,
    target_closure_reason: closure.closureReason,
    target_exception_reason: closure.exceptionReason,
    exception_acknowledged: closure.exceptionAcknowledged,
  });
  if (error) {
    if (error.message.includes("CLOSURE_VERSION_CONFLICT")) return reply(409, "VERSION_CONFLICT");
    if (error.message.includes("CLOSURE_INVALID_STATE")) return reply(409, "INVALID_CLOSURE_STATE");
    if (error.message.includes("CLOSURE_APPROVAL_REQUIRED") || error.message.includes("CLOSURE_LATEST_REPORT_REQUIRED")) return reply(422, "REPORT_OR_APPROVAL_REQUIRED");
    if (error.message.includes("CLOSURE_NOT_AUTHORIZED") || error.message.includes("CLOSURE_SELF_APPROVAL_FORBIDDEN")) return reply(403, "CLOSURE_NOT_AUTHORIZED");
    if (error.message.includes("CLOSURE_REPORT_MISSING")) return reply(422, "REPORT_NOT_FOUND");
    return reply(503, "CLOSURE_UNAVAILABLE");
  }
  return Response.json({ closureId: data }, { headers: { "Cache-Control": "no-store" } });
}
