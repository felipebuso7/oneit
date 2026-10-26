import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { readLimitedBody } from "@/lib/http/limited-body";
import { hasSameOrigin } from "@/lib/http/same-origin";

const schema = z.object({ organizationId: z.string().uuid(), name: z.string().trim().min(2).max(160), email: z.string().trim().email().max(240), technicianType: z.enum(["internal", "partner"]).default("internal"), phone: z.string().trim().max(40).optional(), mobile: z.string().trim().max(40).optional(), jobTitle: z.string().trim().max(160).optional(), hourlyCost: z.number().finite().nonnegative().nullable().optional(), baseAddress: z.string().trim().max(400).optional(), operationalTechnicianId: z.string().uuid().nullable().optional() });
const reply = (status: number, code: string) => Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request) {
  const organizationId = new URL(request.url).searchParams.get("organizationId");
  if (!organizationId || !z.string().uuid().safeParse(organizationId).success) return reply(400, "ORGANIZATION_REQUIRED");
  const supabase = await createClient(); const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");
  const { data, error } = await supabase.from("field_service_technicians").select("id,organization_id,name,email,technician_type,phone,mobile,job_title,hourly_cost,base_address,operational_technician_id,active").eq("organization_id", organizationId).order("name");
  if (error) return reply(503, "TECHNICIANS_UNAVAILABLE");
  return Response.json({ technicians: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED");
  const raw = await readLimitedBody(request, 16 * 1024); if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE");
  let input: unknown; try { input = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = schema.safeParse(input); if (!parsed.success) return reply(400, "INVALID_TECHNICIAN");
  const supabase = await createClient(); const { data: auth, error: authError } = await supabase.auth.getUser(); if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");
  const value = parsed.data;
  const { data, error } = await supabase.from("field_service_technicians").insert({ organization_id: value.organizationId, name: value.name, email: value.email.toLowerCase(), technician_type: value.technicianType, phone: value.phone || null, mobile: value.mobile || null, job_title: value.jobTitle || null, hourly_cost: value.hourlyCost ?? null, base_address: value.baseAddress || null, operational_technician_id: value.operationalTechnicianId ?? null }).select("id,organization_id,name,email,technician_type,phone,mobile,job_title,hourly_cost,base_address,operational_technician_id,active").single();
  if (error) return reply(error.code === "23505" ? 409 : 503, error.code === "23505" ? "TECHNICIAN_ALREADY_EXISTS" : "TECHNICIAN_SAVE_UNAVAILABLE");
  return Response.json({ technician: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
