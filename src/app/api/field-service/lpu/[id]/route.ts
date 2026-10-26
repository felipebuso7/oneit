import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { readLimitedBody } from "@/lib/http/limited-body";
import { hasSameOrigin } from "@/lib/http/same-origin";

const units = ["unidade", "peça", "metro", "centímetro", "hora", "visita", "quilômetro"] as const;
const schema = z.object({
  organizationId: z.string().uuid(),
  description: z.string().trim().min(2).max(240).optional(),
  kind: z.enum(["material", "mao_de_obra", "deslocamento"]).optional(),
  unit: z.enum(units).optional(),
  unitPrice: z.number().finite().nonnegative().optional(),
  validFrom: z.string().date().optional(),
  validUntil: z.string().date().nullable().optional(),
  active: z.boolean().optional(),
});
const reply = (status: number, code: string) => Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED");
  const raw = await readLimitedBody(request, 8 * 1024);
  if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE");
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = schema.safeParse(input);
  if (!parsed.success) return reply(400, "INVALID_LPU_UPDATE");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return reply(400, "INVALID_LPU_ID");
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");
  const value = parsed.data;
  if (value.validUntil && value.validFrom && value.validUntil < value.validFrom) return reply(400, "INVALID_VALIDITY");
  const update = Object.fromEntries(Object.entries({ description: value.description, kind: value.kind, unit: value.unit, unit_price: value.unitPrice, valid_from: value.validFrom, valid_until: value.validUntil, active: value.active }).filter(([, item]) => item !== undefined));
  const { data, error } = await supabase.from("field_service_lpu_items").update(update).eq("id", id).eq("organization_id", value.organizationId).select("id,organization_id,code,description,kind,unit,unit_price,valid_from,valid_until,active").single();
  if (error) return reply(error.code === "PGRST116" ? 404 : 503, error.code === "PGRST116" ? "LPU_ITEM_NOT_FOUND" : "LPU_UPDATE_UNAVAILABLE");
  return Response.json({ item: data }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  const organizationId = new URL(request.url).searchParams.get("organizationId");
  if (!organizationId || !z.string().uuid().safeParse(organizationId).success) return reply(400, "ORGANIZATION_REQUIRED");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return reply(400, "INVALID_LPU_ID");
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");
  const { data, error } = await supabase.from("field_service_lpu_items").update({ active: false }).eq("id", id).eq("organization_id", organizationId).select("id").maybeSingle();
  if (error) return reply(503, "LPU_DEACTIVATE_UNAVAILABLE");
  if (!data) return reply(404, "LPU_NOT_FOUND");
  return new Response(null, { status: 204 });
}
