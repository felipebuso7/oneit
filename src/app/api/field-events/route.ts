import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { offlineFieldEventSchema } from "@/lib/validation/offline-field-event";
import { readLimitedBody } from "@/lib/http/limited-body";
import { hasSameOrigin } from "@/lib/http/same-origin";
import { z } from "zod";

function reply(status: number, code: string) {
  return Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");
  const url = new URL(request.url);
  const ticketId = url.searchParams.get("ticketId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (ticketId && !z.uuid().safeParse(ticketId).success) return reply(400, "INVALID_TICKET");
  if (from && Number.isNaN(Date.parse(from))) return reply(400, "INVALID_FROM");
  if (to && Number.isNaN(Date.parse(to))) return reply(400, "INVALID_TO");
  let query = supabase.from("ticket_field_events").select("id,ticket_id,technician_id,event_type,latitude,longitude,accuracy_meters,location_justification,occurred_at,offline_created_at").order("occurred_at", { ascending: false }).limit(500);
  if (ticketId) query = query.eq("ticket_id", ticketId);
  if (from) query = query.gte("occurred_at", from);
  if (to) query = query.lte("occurred_at", to);
  const { data, error } = await query;
  if (error) return reply(503, "EVENTS_UNAVAILABLE");
  return Response.json({ events: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  // Cookie-authenticated mutations must originate from the app, not an external form.
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED");
  const raw = await readLimitedBody(request, 8192);
  if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE");
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = offlineFieldEventSchema.safeParse(input);
  if (!parsed.success) return reply(400, "INVALID_EVENT");
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");
  if (parsed.data.ownerId !== auth.user.id) return reply(403, "OWNER_MISMATCH");
  const event = parsed.data;
  const { data, error } = await supabase.rpc("sync_ticket_field_event", {
    target_action_id: event.id, target_ticket_id: event.ticketId, expected_version: event.version,
    target_event: event.eventType, target_captured_at: event.capturedAt,
    target_latitude: event.latitude ?? null, target_longitude: event.longitude ?? null,
    target_accuracy: event.accuracy ?? null, target_justification: event.justification ?? null,
  });
  if (error) {
    if (error.message.includes("SYNC_VERSION_CONFLICT") || error.message.includes("Invalid field-event transition")) return reply(409, "STATE_CONFLICT");
    if (error.message.includes("SYNC_KEY_REUSED")) return reply(409, "KEY_CONFLICT");
    if (error.message.includes("SYNC_NOT_AUTHORIZED") || error.message.includes("Only the assigned technician")) return reply(403, "ASSIGNMENT_OR_PERMISSION_CHANGED");
    if (error.message.includes("SYNC_CAPTURE_TIME_INVALID") || error.message.includes("SYNC_INVALID_INPUT") || error.code === "23514") return reply(422, "INVALID_EVENT");
    return reply(503, "SYNC_UNAVAILABLE");
  }
  revalidatePath("/portal/field"); revalidatePath("/portal/tickets");
  return Response.json({ id: event.id, eventId: data }, { headers: { "Cache-Control": "no-store" } });
}
