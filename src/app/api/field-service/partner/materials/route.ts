import { z } from "zod";

import { readLimitedBody } from "@/lib/http/limited-body";
import { createClient } from "@/lib/supabase/server";

const access = z.object({ token: z.string().min(32).max(128), code: z.string().regex(/^\d{6}$/) });
const materialItems = z.array(z.object({
  lpuItemId: z.string().uuid(),
  quantity: z.number().finite().positive().max(100000).refine((value) => Math.abs(value * 1000 - Math.round(value * 1000)) < 0.000001),
})).max(30).refine((items) => new Set(items.map((item) => item.lpuItemId)).size === items.length);
const input = z.discriminatedUnion("action", [
  access.extend({ action: z.literal("LIST") }),
  access.extend({ action: z.literal("SAVE"), items: materialItems }),
]);

function reply(status: number, code: string) {
  return Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED");
  const raw = await readLimitedBody(request, 16 * 1024);
  if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE");
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = input.safeParse(body);
  if (!parsed.success) return reply(400, "INVALID_MATERIAL_DATA");

  const supabase = await createClient();
  const { data, error } = parsed.data.action === "LIST"
    ? await supabase.rpc("get_partner_service_order_materials", { target_token: parsed.data.token, target_code: parsed.data.code })
    : await supabase.rpc("save_partner_service_order_materials", { target_token: parsed.data.token, target_code: parsed.data.code, target_items: parsed.data.items });
  if (error) {
    const message = String(error.message ?? "").toUpperCase();
    if (message.includes("EXPIRED")) return reply(410, "ACCESS_EXPIRED");
    if (message.includes("LOCKED")) return reply(429, "ACCESS_LOCKED");
    if (message.includes("INVALID_STATE")) return reply(409, "MATERIAL_INVALID_STATE");
    if (message.includes("MATERIAL_INVALID_SELECTION")) return reply(422, "MATERIAL_INVALID_SELECTION");
    if (message.includes("MATERIAL_INVALID")) return reply(422, "MATERIAL_INVALID_SELECTION");
    if (message.includes("PARTNER_ACCESS_INVALID")) return reply(401, "ACCESS_INVALID");
    if (message.includes("DOES NOT EXIST") || message.includes("FUNCTION") && message.includes("NOT FOUND")) {
      return reply(503, "MATERIAL_SERVICE_NOT_DEPLOYED");
    }
    return reply(503, "MATERIAL_SERVICE_UNAVAILABLE");
  }
  if (parsed.data.action === "SAVE") return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  // Supabase returns jsonb as an object, but older gateways can wrap a scalar
  // jsonb result in a one-item array or a JSON string. Normalize at the API
  // boundary so the field UI never treats a valid catalog as a load failure.
  let result: unknown = data;
  if (Array.isArray(result)) result = result[0];
  if (typeof result === "string") {
    try { result = JSON.parse(result) as unknown; } catch { result = null; }
  }
  const catalog = result && typeof result === "object" && Array.isArray((result as { catalog?: unknown }).catalog)
    ? (result as { catalog: unknown[] }).catalog : [];
  const used = result && typeof result === "object" && Array.isArray((result as { used?: unknown }).used)
    ? (result as { used: unknown[] }).used : [];
  return Response.json({ catalog, used }, { headers: { "Cache-Control": "no-store" } });
}
