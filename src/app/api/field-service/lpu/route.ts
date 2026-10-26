import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { readLimitedBody } from "@/lib/http/limited-body";
import { hasSameOrigin } from "@/lib/http/same-origin";

const units = ["unidade", "peça", "metro", "centímetro", "hora", "visita", "quilômetro"] as const;
const schema = z.object({
  organizationId: z.string().uuid(),
  code: z.string().trim().min(2).max(60),
  description: z.string().trim().min(2).max(240),
  kind: z.enum(["material", "mao_de_obra", "deslocamento"]).default("material"),
  unit: z.enum(units),
  unitPrice: z.number().finite().nonnegative(),
  validFrom: z.string().date().optional(),
  validUntil: z.string().date().optional().nullable(),
}).refine((value) => !value.validUntil || !value.validFrom || value.validUntil >= value.validFrom, { message: "INVALID_VALIDITY" });
const reply = (status: number, code: string) => Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });
const select = "id,organization_id,code,description,kind,unit,unit_price,valid_from,valid_until,active";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const organizationId = params.get("organizationId");
  if (!organizationId || !z.string().uuid().safeParse(organizationId).success) return reply(400, "ORGANIZATION_REQUIRED");
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");
  const { data, error } = await supabase.from("field_service_lpu_items").select(select).eq("organization_id", organizationId).eq("active", true).order("code");
  if (error) return reply(503, "LPU_UNAVAILABLE");
  return Response.json({ items: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED");
  const raw = await readLimitedBody(request, 12 * 1024);
  if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE");
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = schema.safeParse(input);
  if (!parsed.success) return reply(400, parsed.error.issues.some((issue) => issue.message === "INVALID_VALIDITY") ? "INVALID_VALIDITY" : "INVALID_LPU_ITEM");
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");
  const value = parsed.data;
  const { data, error } = await supabase.from("field_service_lpu_items").insert({ organization_id: value.organizationId, code: value.code.toUpperCase(), description: value.description, kind: value.kind, unit: value.unit, unit_price: value.unitPrice, valid_from: value.validFrom ?? new Date().toISOString().slice(0, 10), valid_until: value.validUntil ?? null, active: true }).select(select).single();
  if (error) return reply(error.code === "23505" ? 409 : 503, error.code === "23505" ? "LPU_ITEM_ALREADY_EXISTS" : "LPU_ITEM_SAVE_UNAVAILABLE");
  return Response.json({ item: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
