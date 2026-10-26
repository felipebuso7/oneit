import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { readLimitedBody } from "@/lib/http/limited-body";
import { hasSameOrigin } from "@/lib/http/same-origin";

const schema = z.object({
  organizationId: z.string().uuid(),
  companyId: z.string().uuid(),
  name: z.string().trim().min(2).max(160),
  address: z.string().trim().min(5).max(240),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().length(2).default("SP"),
  region: z.string().trim().min(2).max(80),
  distanceCapitalKm: z.number().finite().nonnegative(),
  latitude: z.number().finite().min(-90).max(90).nullable().optional(),
  longitude: z.number().finite().min(-180).max(180).nullable().optional(),
  operationalLocationId: z.string().uuid().nullable().optional(),
});
const reply = (status: number, code: string) => Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });
const select = "id,organization_id,company_id,name,address,city,state,region,distance_capital_km,latitude,longitude,operational_location_id,active";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const organizationId = params.get("organizationId");
  if (!organizationId || !z.string().uuid().safeParse(organizationId).success) return reply(400, "ORGANIZATION_REQUIRED");
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");
  let query = supabase.from("field_service_polos").select(select).eq("organization_id", organizationId).eq("active", true).order("name");
  const companyId = params.get("companyId");
  if (companyId) {
    if (!z.string().uuid().safeParse(companyId).success) return reply(400, "INVALID_COMPANY");
    query = query.eq("company_id", companyId);
  }
  const { data, error } = await query;
  if (error) return reply(503, "POLOS_UNAVAILABLE");
  return Response.json({ polos: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED");
  const raw = await readLimitedBody(request, 12 * 1024);
  if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE");
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = schema.safeParse(input);
  if (!parsed.success) return reply(400, "INVALID_POLO");
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");
  const value = parsed.data;
  const { data, error } = await supabase.from("field_service_polos").insert({ organization_id: value.organizationId, company_id: value.companyId, name: value.name, address: value.address, city: value.city, state: value.state.toUpperCase(), region: value.region, distance_capital_km: value.distanceCapitalKm, latitude: value.latitude ?? null, longitude: value.longitude ?? null, operational_location_id: value.operationalLocationId ?? null, active: true }).select(select).single();
  if (error) return reply(error.code === "23505" ? 409 : 503, error.code === "23505" ? "POLO_ALREADY_EXISTS" : "POLO_SAVE_UNAVAILABLE");
  return Response.json({ polo: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
