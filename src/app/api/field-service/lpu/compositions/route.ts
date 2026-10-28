import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { readLimitedBody } from "@/lib/http/limited-body";
import { hasSameOrigin } from "@/lib/http/same-origin";

const lineSchema = z.object({ lpuItemId: z.string().uuid(), quantity: z.number().finite().positive().max(100000) });
const createSchema = z.object({ organizationId: z.string().uuid(), code: z.string().trim().min(2).max(60), description: z.string().trim().min(2).max(240), validFrom: z.string().date().optional(), validUntil: z.string().date().nullable().optional(), lines: z.array(lineSchema).min(1).max(100) }).refine((value) => !value.validUntil || !value.validFrom || value.validUntil >= value.validFrom, { message: "INVALID_VALIDITY" });
const select = "id,organization_id,code,description,active,valid_from,valid_until,field_service_lpu_composition_lines(id,lpu_item_id,quantity,unit_price)";
const reply = (status: number, code: string) => Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request) {
  const organizationId = new URL(request.url).searchParams.get("organizationId");
  if (!organizationId || !z.string().uuid().safeParse(organizationId).success) return reply(400, "ORGANIZATION_REQUIRED");
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");
  const { data, error } = await supabase.from("field_service_lpu_compositions").select(select).eq("organization_id", organizationId).order("code");
  if (error) return reply(503, "LPU_COMPOSITIONS_UNAVAILABLE");
  return Response.json({ compositions: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED");
  const raw = await readLimitedBody(request, 24 * 1024);
  if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE");
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return reply(400, parsed.error.issues.some((issue) => issue.message === "INVALID_VALIDITY") ? "INVALID_VALIDITY" : "INVALID_LPU_COMPOSITION");
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");
  const value = parsed.data;
  const { data: id, error } = await supabase.rpc("create_field_service_lpu_composition", { target_organization_id: value.organizationId, target_code: value.code, target_description: value.description, target_valid_from: value.validFrom ?? null, target_valid_until: value.validUntil ?? null, target_lines: value.lines });
  if (error) {
    const code = error.message.includes("ALREADY_EXISTS") ? "LPU_COMPOSITION_ALREADY_EXISTS" : error.message.includes("NOT_AUTHORIZED") ? "LPU_COMPOSITION_NOT_AUTHORIZED" : error.message.includes("ITEM_NOT_FOUND") ? "LPU_COMPOSITION_ITEM_NOT_FOUND" : error.message.includes("INVALID_QUANTITY") ? "LPU_COMPOSITION_INVALID_QUANTITY" : "LPU_COMPOSITION_SAVE_UNAVAILABLE";
    return reply(code.endsWith("NOT_AUTHORIZED") ? 403 : code.endsWith("ALREADY_EXISTS") ? 409 : 400, code);
  }
  return Response.json({ id }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
