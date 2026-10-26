import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { executionSyncSchema } from "@/lib/validation/execution-sync";
import { readLimitedBody } from "@/lib/http/limited-body";
import { hasSameOrigin } from "@/lib/http/same-origin";

function reply(status: number, code: string) { return Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } }); }
export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED");
  const raw = await readLimitedBody(request, 384 * 1024);
  if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE");
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = executionSyncSchema.safeParse(input);
  if (!parsed.success) return reply(400, "INVALID_EXECUTION");
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");
  const execution = parsed.data;
  if (execution.ownerId !== auth.user.id) return reply(403, "OWNER_MISMATCH");
  // Canonical ordering makes retried payloads stable and matches the database snapshot.
  const items = execution.items.slice().sort((a, b) => a.item_code < b.item_code ? -1 : a.item_code > b.item_code ? 1 : 0);
  const { data, error } = await supabase.rpc("sync_ticket_execution", {
    target_action_id: execution.actionId, target_ticket_id: execution.ticketId, expected_version: execution.version,
    target_fault_domain: execution.faultDomain, target_diagnosis: execution.diagnosis, target_solution: execution.solution,
    target_answers: execution.answers, target_items: items,
  });
  if (error) {
    if (/VERSION_CONFLICT|INVALID_STATE|CHECKLIST_CONFLICT|KEY_REUSED/.test(error.message)) return reply(409, "EXECUTION_CONFLICT");
    if (error.message.includes("NOT_AUTHORIZED")) return reply(403, "PERMISSION_OR_ASSIGNMENT_CHANGED");
    if (/INVALID_INPUT|INVALID_CHECKLIST/.test(error.message) || ["23514", "23502"].includes(error.code)) return reply(422, "INVALID_EXECUTION");
    return reply(503, "SYNC_UNAVAILABLE");
  }
  revalidatePath("/portal/field"); revalidatePath("/portal/tickets");
  return Response.json({ actionId: execution.actionId, recordId: data }, { headers: { "Cache-Control": "no-store" } });
}
