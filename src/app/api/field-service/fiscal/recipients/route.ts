import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { readLimitedBody } from "@/lib/http/limited-body";
import { hasSameOrigin } from "@/lib/http/same-origin";

const schema = z.object({ organizationId: z.string().uuid(), recipientType: z.enum(["MEASUREMENT", "FISCAL"]), email: z.string().email(), displayName: z.string().trim().min(2).max(120) });
const reply = (status: number, code: string) => Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request) {
  const organizationId = new URL(request.url).searchParams.get("organizationId"); if (!organizationId || !z.string().uuid().safeParse(organizationId).success) return reply(400, "ORGANIZATION_REQUIRED");
  const supabase = await createClient(); const { data: auth, error: authError } = await supabase.auth.getUser(); if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");
  const { data: role, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", auth.user.id).eq("organization_id", organizationId).in("role", ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER", "FINANCE"]).limit(1).maybeSingle();
  if (roleError) return reply(503, "RECIPIENT_AUTHORIZATION_UNAVAILABLE");
  if (!role) return reply(403, "RECIPIENTS_NOT_AUTHORIZED");
  const { data, error } = await supabase.from("billing_recipients").select("id,recipient_type,email,display_name,active").eq("organization_id", organizationId).eq("active", true).order("recipient_type").order("display_name"); if (error) return reply(503, "RECIPIENTS_UNAVAILABLE");
  return Response.json({ recipients: data }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED"); if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED");
  const raw = await readLimitedBody(request, 8 * 1024); if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE"); let input: unknown; try { input = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = schema.safeParse(input); if (!parsed.success) return reply(400, "INVALID_RECIPIENT"); const supabase = await createClient(); const { data: auth, error: authError } = await supabase.auth.getUser(); if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");
  const { data, error } = await supabase.from("billing_recipients").upsert({ organization_id: parsed.data.organizationId, recipient_type: parsed.data.recipientType, email: parsed.data.email.toLowerCase(), display_name: parsed.data.displayName, active: true }, { onConflict: "organization_id,recipient_type,email" }).select("id,recipient_type,email,display_name,active").single();
  if (error) return reply(error.code === "23505" ? 409 : 503, error.code === "23505" ? "RECIPIENT_ALREADY_EXISTS" : "RECIPIENT_SAVE_UNAVAILABLE"); return Response.json({ recipient: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
