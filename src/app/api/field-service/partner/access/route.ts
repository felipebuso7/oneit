import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { readLimitedBody } from "@/lib/http/limited-body";
import { hasSameOrigin } from "@/lib/http/same-origin";

const schema = z.object({
  serviceOrderId: z.string().uuid(),
  supplierId: z.string().uuid().nullable().optional(),
  validForMinutes: z.number().int().min(15).max(10_080).default(480),
});

const reply = (status: number, code: string) => Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });

/** Emite um único acesso temporário para a OS. A função do banco revoga o link anterior. */
export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED");
  const raw = await readLimitedBody(request, 2 * 1024);
  if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE");
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = schema.safeParse(input);
  if (!parsed.success) return reply(400, "INVALID_PARTNER_ACCESS");

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");

  const { data, error } = await supabase.rpc("create_service_order_partner_access", {
    target_service_order_id: parsed.data.serviceOrderId,
    target_supplier_id: parsed.data.supplierId ?? null,
    target_valid_for_minutes: parsed.data.validForMinutes,
  });
  const access = Array.isArray(data) ? data[0] : null;
  if (error || !access) {
    const message = error?.message ?? "";
    if (message.includes("NOT_AUTHORIZED")) return reply(403, "PARTNER_ACCESS_NOT_AUTHORIZED");
    if (message.includes("INVALID_ORDER_STATE")) return reply(409, "PARTNER_ACCESS_INVALID_ORDER_STATE");
    return reply(503, "PARTNER_ACCESS_UNAVAILABLE");
  }
  return Response.json({
    access: {
      id: access.access_id,
      token: access.access_token,
      code: access.access_code,
      validForMinutes: parsed.data.validForMinutes,
    },
  }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
