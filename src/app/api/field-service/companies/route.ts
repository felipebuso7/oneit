import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { readLimitedBody } from "@/lib/http/limited-body";
import { hasSameOrigin } from "@/lib/http/same-origin";

const schema = z.object({
  organizationId: z.string().uuid(),
  legalName: z.string().trim().min(2).max(160),
  tradeName: z.string().trim().max(160).optional(),
  cnpj: z.string().trim().max(24).optional(),
});
const reply = (status: number, code: string) => Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request) {
  const organizationId = new URL(request.url).searchParams.get("organizationId");
  if (!organizationId || !z.string().uuid().safeParse(organizationId).success) return reply(400, "ORGANIZATION_REQUIRED");
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");
  const { data, error } = await supabase.from("field_service_companies").select("id,organization_id,legal_name,trade_name,cnpj,active").eq("organization_id", organizationId).eq("active", true).order("legal_name");
  if (error) return reply(503, "COMPANIES_UNAVAILABLE");
  return Response.json({ companies: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED");
  const raw = await readLimitedBody(request, 8 * 1024);
  if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE");
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = schema.safeParse(input);
  if (!parsed.success) return reply(400, "INVALID_COMPANY");
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");
  const cnpj = parsed.data.cnpj?.replace(/\D/g, "") || null;
  if (cnpj && cnpj.length !== 14) return reply(400, "INVALID_CNPJ");
  const { data, error } = await supabase.from("field_service_companies").insert({ organization_id: parsed.data.organizationId, legal_name: parsed.data.legalName, trade_name: parsed.data.tradeName || null, cnpj, active: true }).select("id,organization_id,legal_name,trade_name,cnpj,active").single();
  if (error) return reply(error.code === "23505" ? 409 : 503, error.code === "23505" ? "COMPANY_ALREADY_EXISTS" : "COMPANY_SAVE_UNAVAILABLE");
  return Response.json({ company: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
