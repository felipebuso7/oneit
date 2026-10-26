import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { readLimitedBody } from "@/lib/http/limited-body";
import { hasSameOrigin } from "@/lib/http/same-origin";

const schema = z.object({ measurementSheetId: z.string().uuid(), reason: z.string().trim().min(3).max(240).default("CONTESTATION") });
const reply = (status: number, code: string) => Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED"); if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED"); const raw = await readLimitedBody(request, 8 * 1024); if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE"); let input: unknown; try { input = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = schema.safeParse(input); if (!parsed.success) return reply(400, "INVALID_RECALCULATION"); const supabase = await createClient(); const { data: auth, error: authError } = await supabase.auth.getUser(); if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");
  const { data, error } = await supabase.rpc("recalculate_measurement_sheet", { target_sheet_id: parsed.data.measurementSheetId, target_actor: auth.user.id, target_reason: parsed.data.reason }); if (error) { if (error.message.includes("not_found")) return reply(404, "MEASUREMENT_NOT_FOUND"); if (error.message.includes("forbidden")) return reply(403, "RECALCULATION_FORBIDDEN"); if (error.message.includes("invalid_state")) return reply(409, "RECALCULATION_INVALID_STATE"); return reply(503, "RECALCULATION_UNAVAILABLE"); }
  return Response.json({ version: data }, { headers: { "Cache-Control": "no-store" } });
}
