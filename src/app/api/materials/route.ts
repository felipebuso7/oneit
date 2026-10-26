import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { readLimitedBody } from "@/lib/http/limited-body";
import { hasSameOrigin } from "@/lib/http/same-origin";
import { offlineMaterialSchema } from "@/lib/validation/offline-material";
function reply(status: number, code: string) { return Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } }); }
export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED");
  const raw = await readLimitedBody(request, 8192); if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE");
  let input: unknown; try { input = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = offlineMaterialSchema.safeParse(input); if (!parsed.success) return reply(400, "INVALID_MATERIAL");
  const supabase = await createClient(); const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return reply(401, "AUTH_REQUIRED"); if (parsed.data.ownerId !== auth.user.id) return reply(403, "OWNER_MISMATCH");
  const material = parsed.data; const { data, error } = await supabase.rpc("sync_ticket_material", { target_action_id: material.id, target_ticket_id: material.ticketId, expected_version: material.version, target_material_id: material.materialId, target_quantity: material.quantity });
  if (error) {
    if (/VERSION_CONFLICT|INVALID_STATE|KEY_REUSED/.test(error.message)) return reply(409, "MATERIAL_CONFLICT");
    if (error.message.includes("NOT_AUTHORIZED")) return reply(403, "PERMISSION_OR_ASSIGNMENT_CHANGED");
    if (/INVALID_INPUT|INVALID_SELECTION/.test(error.message) || ["23514", "23502"].includes(error.code)) return reply(422, "INVALID_MATERIAL");
    return reply(503, "SYNC_UNAVAILABLE");
  }
  revalidatePath("/portal/field"); return Response.json({ id: material.id, materialRecordId: data }, { headers: { "Cache-Control": "no-store" } });
}
