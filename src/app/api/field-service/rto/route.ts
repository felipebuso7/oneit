import { createClient } from "@/lib/supabase/server";
import { hasSameOrigin } from "@/lib/http/same-origin";
import { readLimitedBody } from "@/lib/http/limited-body";
import { z } from "zod";
import { createStorageAdmin } from "@/lib/supabase/storage-admin";
import { storeFieldServiceRtoPdf } from "@/lib/reports/store-field-service-rto";

const schema = z.object({ queueId: z.string().uuid() });
const reply = (status: number, code: string) => Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reportId = z.string().uuid().safeParse(searchParams.get("reportId"));
  if (!reportId.success) return reply(400, "INVALID_REPORT");
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");
  const { data: report, error } = await supabase.from("field_service_rto_reports").select("storage_path, organization_id, service_order_id").eq("id", reportId.data).single();
  if (error || !report?.storage_path) return reply(404, "RTO_NOT_FOUND");
  const { data: role, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", auth.user.id).eq("organization_id", report.organization_id).in("role", ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER", "FINANCE"]).limit(1).maybeSingle();
  if (roleError) return reply(503, "RTO_AUTHORIZATION_UNAVAILABLE");
  if (!role) return reply(403, "RTO_NOT_AUTHORIZED");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return reply(503, "RTO_STORAGE_UNAVAILABLE");
  try {
    const storage = createStorageAdmin("ticket-reports");
    const { data } = await storage.createSignedUrl(report.storage_path, 300);
    if (!data?.signedUrl) return reply(503, "RTO_DOWNLOAD_UNAVAILABLE");
    await supabase.from("audit_logs").insert({ organization_id: report.organization_id, actor_id: auth.user.id, action: "FIELD_SERVICE_RTO_VIEWED", entity_type: "field_service_rto_report", entity_id: reportId.data, after_value: { service_order_id: report.service_order_id, mode: searchParams.get("redirect") === "1" ? "REDIRECT" : "URL" }, source: "WEB" });
    if (searchParams.get("redirect") === "1") return Response.redirect(data.signedUrl, 302);
    return Response.json({ downloadUrl: data.signedUrl }, { headers: { "Cache-Control": "no-store" } });
  } catch { return reply(503, "RTO_DOWNLOAD_UNAVAILABLE"); }
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED");
  const raw = await readLimitedBody(request, 4096); if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE");
  let body: unknown; try { body = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = schema.safeParse(body); if (!parsed.success) return reply(400, "INVALID_RTO");
  const supabase = await createClient(); const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");
  const { data, error } = await supabase.rpc("generate_field_service_rto", { target_queue_id: parsed.data.queueId });
  if (error) {
    if (error.message.includes("RTO_REVIEW_REQUIRED")) return reply(409, "RTO_REVIEW_REQUIRED");
    if (error.message.includes("RTO_NOT_AUTHORIZED")) return reply(403, "RTO_NOT_AUTHORIZED");
    if (error.message.includes("RTO_DATA_INCOMPLETE")) return reply(422, "RTO_DATA_INCOMPLETE");
    return reply(503, "RTO_UNAVAILABLE");
  }
  try {
    const result = await storeFieldServiceRtoPdf(supabase, data);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    const code = cause instanceof Error && /^RTO_(STORAGE_UNAVAILABLE|SNAPSHOT_UNAVAILABLE|REVIEWER_UNAVAILABLE|UPLOAD_FAILED|REGISTER_FAILED|DOWNLOAD_UNAVAILABLE)$/.test(cause.message)
      ? cause.message : "RTO_STORAGE_UNAVAILABLE";
    return reply(503, code);
  }
}
