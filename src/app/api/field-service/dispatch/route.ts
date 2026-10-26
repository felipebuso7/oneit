import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { readLimitedBody } from "@/lib/http/limited-body";
import { hasSameOrigin } from "@/lib/http/same-origin";

const schema = z.object({
  ticketId: z.string().uuid(),
  technicianId: z.string().uuid(),
  locationId: z.string().uuid(),
  plannedStartAt: z.string().datetime({ offset: true }),
  plannedEndAt: z.string().datetime({ offset: true }),
  localContactName: z.string().trim().max(160).optional(),
  localContactPhone: z.string().trim().max(40).optional(),
});

const reply = (status: number, code: string) => Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED");
  const raw = await readLimitedBody(request, 8 * 1024);
  if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE");
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = schema.safeParse(input);
  if (!parsed.success || new Date(parsed.data.plannedEndAt) <= new Date(parsed.data.plannedStartAt)) return reply(400, "INVALID_DISPATCH");

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");
  const value = parsed.data;
  const { data, error } = await supabase.rpc("dispatch_ticket_to_field", {
    target_ticket_id: value.ticketId,
    target_technician_id: value.technicianId,
    target_location_id: value.locationId,
    target_planned_start_at: value.plannedStartAt,
    target_planned_end_at: value.plannedEndAt,
    target_local_contact_name: value.localContactName ?? null,
    target_local_contact_phone: value.localContactPhone ?? null,
  });
  const dispatch = Array.isArray(data) ? data[0] : null;
  if (error || !dispatch) {
    const message = error?.message ?? "";
    if (message.includes("SCHEDULE_CONFLICT")) return reply(409, "SCHEDULE_CONFLICT");
    if (message.includes("ORDER_ALREADY_EXISTS") || message.includes("INVALID_TICKET_STATE")) return reply(409, "DISPATCH_STATE_CONFLICT");
    if (message.includes("NOT_AUTHORIZED")) return reply(403, "DISPATCH_NOT_AUTHORIZED");
    if (message.includes("INVALID_TECHNICIAN") || message.includes("INVALID_LOCATION") || message.includes("INVALID_WINDOW")) return reply(422, "DISPATCH_REFERENCE_INVALID");
    return reply(503, "DISPATCH_UNAVAILABLE");
  }
  return Response.json({ dispatch }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
