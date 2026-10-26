import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { readLimitedBody } from "@/lib/http/limited-body";
import { hasSameOrigin } from "@/lib/http/same-origin";

const schema = z.object({
  organizationId: z.string().uuid(),
  companyId: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(160).optional(),
  address: z.string().trim().min(5).max(240).optional(),
  city: z.string().trim().min(2).max(100).optional(),
  state: z.string().trim().length(2).optional(),
  region: z.string().trim().min(2).max(80).optional(),
  distanceCapitalKm: z.number().finite().nonnegative().optional(),
  latitude: z.number().finite().min(-90).max(90).nullable().optional(),
  longitude: z.number().finite().min(-180).max(180).nullable().optional(),
  operationalLocationId: z.string().uuid().nullable().optional(),
  active: z.boolean().optional(),
});
const reply = (status: number, code: string) => Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });
const select = "id,organization_id,company_id,name,address,city,state,region,distance_capital_km,latitude,longitude,operational_location_id,active";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  const raw = await readLimitedBody(request, 12 * 1024); if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE");
  let input: unknown; try { input = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = schema.safeParse(input); if (!parsed.success) return reply(400, "INVALID_POLO_UPDATE");
  const { id } = await params; if (!z.string().uuid().safeParse(id).success) return reply(400, "INVALID_POLO_ID");
  const supabase = await createClient(); const { data: auth, error: authError } = await supabase.auth.getUser(); if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");
  const value = parsed.data;
  const update = Object.fromEntries(Object.entries({ company_id: value.companyId, name: value.name, address: value.address, city: value.city, state: value.state?.toUpperCase(), region: value.region, distance_capital_km: value.distanceCapitalKm, latitude: value.latitude, longitude: value.longitude, operational_location_id: value.operationalLocationId, active: value.active }).filter(([, item]) => item !== undefined));
  const { data, error } = await supabase.from("field_service_polos").update(update).eq("id", id).eq("organization_id", value.organizationId).select(select).single();
  if (error) return reply(error.code === "PGRST116" ? 404 : error.code === "23505" ? 409 : 503, error.code === "PGRST116" ? "POLO_NOT_FOUND" : error.code === "23505" ? "POLO_ALREADY_EXISTS" : "POLO_UPDATE_UNAVAILABLE");
  return Response.json({ polo: data }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  const organizationId = new URL(request.url).searchParams.get("organizationId"); if (!organizationId || !z.string().uuid().safeParse(organizationId).success) return reply(400, "ORGANIZATION_REQUIRED");
  const { id } = await params; if (!z.string().uuid().safeParse(id).success) return reply(400, "INVALID_POLO_ID");
  const supabase = await createClient(); const { data: auth, error: authError } = await supabase.auth.getUser(); if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");
  const { data, error } = await supabase.from("field_service_polos").update({ active: false }).eq("id", id).eq("organization_id", organizationId).select("id").maybeSingle();
  if (error) return reply(503, "POLO_DEACTIVATE_UNAVAILABLE");
  if (!data) return reply(404, "POLO_NOT_FOUND");
  return new Response(null, { status: 204 });
}
