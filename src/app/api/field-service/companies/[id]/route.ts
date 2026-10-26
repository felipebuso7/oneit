import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { readLimitedBody } from "@/lib/http/limited-body";
import { hasSameOrigin } from "@/lib/http/same-origin";

const schema = z.object({ organizationId: z.string().uuid(), legalName: z.string().trim().min(2).max(160).optional(), tradeName: z.string().trim().max(160).nullable().optional(), cnpj: z.string().trim().max(24).nullable().optional(), active: z.boolean().optional() });
const reply = (status: number, code: string) => Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  const raw = await readLimitedBody(request, 8 * 1024); if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE");
  let input: unknown; try { input = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = schema.safeParse(input); if (!parsed.success) return reply(400, "INVALID_COMPANY_UPDATE");
  const { id } = await params; if (!z.string().uuid().safeParse(id).success) return reply(400, "INVALID_COMPANY_ID");
  const supabase = await createClient(); const { data: auth, error: authError } = await supabase.auth.getUser(); if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");
  const cnpj = parsed.data.cnpj === undefined ? undefined : parsed.data.cnpj ? parsed.data.cnpj.replace(/\D/g, "") : null;
  if (cnpj && cnpj.length !== 14) return reply(400, "INVALID_CNPJ");
  const update = Object.fromEntries(Object.entries({ legal_name: parsed.data.legalName, trade_name: parsed.data.tradeName, cnpj, active: parsed.data.active }).filter(([, value]) => value !== undefined));
  const { data, error } = await supabase.from("field_service_companies").update(update).eq("id", id).eq("organization_id", parsed.data.organizationId).select("id,organization_id,legal_name,trade_name,cnpj,active").single();
  if (error) return reply(error.code === "PGRST116" ? 404 : error.code === "23505" ? 409 : 503, error.code === "PGRST116" ? "COMPANY_NOT_FOUND" : error.code === "23505" ? "COMPANY_ALREADY_EXISTS" : "COMPANY_UPDATE_UNAVAILABLE");
  return Response.json({ company: data }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  const organizationId = new URL(request.url).searchParams.get("organizationId"); if (!organizationId || !z.string().uuid().safeParse(organizationId).success) return reply(400, "ORGANIZATION_REQUIRED");
  const { id } = await params; if (!z.string().uuid().safeParse(id).success) return reply(400, "INVALID_COMPANY_ID");
  const supabase = await createClient(); const { data: auth, error: authError } = await supabase.auth.getUser(); if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");
  const { data, error } = await supabase.from("field_service_companies").update({ active: false }).eq("id", id).eq("organization_id", organizationId).select("id").maybeSingle();
  if (error) return reply(503, "COMPANY_DEACTIVATE_UNAVAILABLE");
  if (!data) return reply(404, "COMPANY_NOT_FOUND");
  return new Response(null, { status: 204 });
}
