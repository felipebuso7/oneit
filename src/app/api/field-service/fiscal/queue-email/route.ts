import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { readLimitedBody } from "@/lib/http/limited-body";
import { hasSameOrigin } from "@/lib/http/same-origin";
import { billingEmailIdempotencyKey, fiscalEmailAllowed, measurementEmailAllowed } from "@/lib/field-service/billing-email-context";

const uuid = z.string().uuid();
const common = z.object({ organizationId: uuid, recipients: z.array(z.string().email()).min(1).max(50), subject: z.string().trim().min(3).max(240), attachments: z.array(z.object({ name: z.string().min(1).max(160), contentType: z.string().min(1).max(120) })).max(10).default([]), idempotencyKey: z.string().trim().min(8).max(180).optional(), spreadsheetUrl: z.string().url().max(2048).optional(), status: z.never().optional(), provider: z.never().optional(), providerMessageId: z.never().optional(), sentAt: z.never().optional() });
const schema = z.discriminatedUnion("emailType", [
  common.extend({ emailType: z.literal("MEASUREMENT"), measurementSheetId: uuid, fiscalBatchId: z.never().optional() }),
  common.extend({ emailType: z.literal("FISCAL"), fiscalBatchId: uuid, measurementSheetId: z.never().optional() }),
]);
const reply = (status: number, code: string) => Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED");
  const raw = await readLimitedBody(request, 24 * 1024);
  if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE");
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = schema.safeParse(input);
  if (!parsed.success) return reply(400, "INVALID_BILLING_EMAIL");

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");
  const value = parsed.data;
  let measurementSheetVersionId: string | null = null;
  let idempotencyKey: string;

  if (value.emailType === "MEASUREMENT") {
    const { data: sheet, error: sheetError } = await supabase.from("measurement_sheets").select("id,organization_id,billing_period_id").eq("id", value.measurementSheetId).maybeSingle();
    if (sheetError) return reply(503, "MEASUREMENT_UNAVAILABLE");
    if (!sheet || sheet.organization_id !== value.organizationId) return reply(404, "MEASUREMENT_NOT_FOUND");
    const { data: period, error: periodError } = await supabase.from("billing_periods").select("status").eq("id", sheet.billing_period_id).eq("organization_id", value.organizationId).maybeSingle();
    if (periodError) return reply(503, "BILLING_PERIOD_UNAVAILABLE");
    if (!period) return reply(409, "BILLING_PERIOD_MISSING");
    const { data: version, error: versionError } = await supabase.from("measurement_sheet_versions").select("id,version,status").eq("measurement_sheet_id", sheet.id).eq("organization_id", value.organizationId).order("version", { ascending: false }).limit(1).maybeSingle();
    if (versionError) return reply(503, "MEASUREMENT_VERSION_UNAVAILABLE");
    if (!version || !measurementEmailAllowed(period.status, version.status)) return reply(409, "MEASUREMENT_NOT_READY_FOR_EMAIL");
    measurementSheetVersionId = version.id;
    idempotencyKey = billingEmailIdempotencyKey({ emailType: "MEASUREMENT", measurementSheetId: sheet.id, versionId: version.id });
  } else {
    const { data: batch, error: batchError } = await supabase.from("fiscal_batches").select("id,organization_id,status,measurement_sheet_ids").eq("id", value.fiscalBatchId).maybeSingle();
    if (batchError) return reply(503, "FISCAL_BATCH_UNAVAILABLE");
    if (!batch || batch.organization_id !== value.organizationId) return reply(404, "FISCAL_BATCH_NOT_FOUND");
    if (!fiscalEmailAllowed(batch.status)) return reply(409, "FISCAL_BATCH_NOT_READY_FOR_EMAIL");
    const sheetIds = batch.measurement_sheet_ids ?? [];
    if (!sheetIds.length || new Set(sheetIds).size !== sheetIds.length) return reply(409, "FISCAL_BATCH_SHEETS_INVALID");
    const { data: sheets, error: sheetsError } = await supabase.from("measurement_sheets").select("id,organization_id").eq("organization_id", value.organizationId).in("id", sheetIds);
    if (sheetsError) return reply(503, "FISCAL_BATCH_SHEETS_UNAVAILABLE");
    if (sheets?.length !== sheetIds.length || sheets.some((sheet) => sheet.organization_id !== value.organizationId)) return reply(409, "FISCAL_BATCH_SHEETS_INVALID");
    idempotencyKey = billingEmailIdempotencyKey({ emailType: "FISCAL", fiscalBatchId: batch.id });
  }
  if (value.idempotencyKey && value.idempotencyKey !== idempotencyKey) return reply(422, "INVALID_IDEMPOTENCY_KEY");

  const { data: configured, error: recipientError } = await supabase.from("billing_recipients").select("email").eq("organization_id", value.organizationId).eq("recipient_type", value.emailType).eq("active", true).in("email", value.recipients);
  if (recipientError) return reply(503, "RECIPIENTS_UNAVAILABLE");
  const allowed = new Set((configured ?? []).map((item) => item.email.toLowerCase()));
  if (value.recipients.some((email) => !allowed.has(email.toLowerCase()))) return reply(422, "RECIPIENT_NOT_CONFIGURED");

  const { data, error } = await supabase.from("billing_email_log").insert({ organization_id: value.organizationId, email_type: value.emailType, fiscal_batch_id: value.emailType === "FISCAL" ? value.fiscalBatchId : null, measurement_sheet_id: value.emailType === "MEASUREMENT" ? value.measurementSheetId : null, idempotency_key: idempotencyKey, context: { spreadsheetUrl: value.spreadsheetUrl ?? null, emailType: value.emailType, measurementSheetId: value.emailType === "MEASUREMENT" ? value.measurementSheetId : null, measurementSheetVersionId, fiscalBatchId: value.emailType === "FISCAL" ? value.fiscalBatchId : null }, recipients: value.recipients, subject: value.subject, attachments: value.attachments, provider: "PENDING", status: "QUEUED", created_by: auth.user.id }).select("id,status,provider,created_at").single();
  if (error?.code === "23505") {
    const existing = await supabase.from("billing_email_log").select("id,status,provider,created_at").eq("organization_id", value.organizationId).eq("idempotency_key", idempotencyKey).maybeSingle();
    if (existing.data) return Response.json({ queued: false, duplicate: true, emailLog: existing.data }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
  if (error) return reply(503, "EMAIL_QUEUE_UNAVAILABLE");
  return Response.json({ queued: true, emailLog: data }, { status: 202, headers: { "Cache-Control": "no-store" } });
}


