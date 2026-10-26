import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { hasSameOrigin } from "@/lib/http/same-origin";

const reply = (status: number, code: string) => Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request) {
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  const params = new URL(request.url).searchParams;
  const organizationId = params.get("organizationId");
  if (!organizationId || !z.string().uuid().safeParse(organizationId).success) return reply(400, "INVALID_ORGANIZATION");
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");
  let query = supabase.from("billing_email_log").select("id,email_type,status,provider,recipients,subject,attachments,context,created_at,sent_at,error_message").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(Math.min(Number(params.get("limit") ?? 50) || 50, 100));
  const emailType = params.get("emailType");
  const status = params.get("status");
  if (emailType === "MEASUREMENT" || emailType === "FISCAL") query = query.eq("email_type", emailType);
  if (status === "QUEUED" || status === "SENT" || status === "FAILED") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return reply(503, "EMAIL_LOG_UNAVAILABLE");
  return Response.json({ emailLogs: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

// Mantém a URL anterior sem oferecer um segundo caminho de inserção com regras diferentes.
export { POST } from "../queue-email/route";
