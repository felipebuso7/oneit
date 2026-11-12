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
    const message = error.message ?? "";
    if (message.includes("EXPIRED")) return reply(410, "ACCESS_EXPIRED");
    if (message.includes("LOCKED")) return reply(429, "ACCESS_LOCKED");
    if (message.includes("INVALID_STATE")) return reply(409, "MATERIAL_INVALID_STATE");
    if (message.includes("MATERIAL_INVALID")) return reply(422, "MATERIAL_INVALID_SELECTION");
    if (message.includes("PARTNER_ACCESS_INVALID")) return reply(401, "ACCESS_INVALID");
    return reply(503, "MATERIAL_SERVICE_UNAVAILABLE");
  }
  return Response.json(parsed.data.action === "LIST" ? { catalog: data?.catalog ?? [], used: data?.used ?? [] } : { ok: true }, { headers: { "Cache-Control": "no-store" } });
}
