import { createHash } from "node:crypto";

import { fieldServiceRtoSnapshotSchema, renderFieldServiceRtoPdf } from "@/domain/reports/pdf";
import { createClient } from "@/lib/supabase/server";
import { createStorageAdmin } from "@/lib/supabase/storage-admin";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/** Persist the PDF after the database has created an authorized RTO snapshot. */
export async function storeFieldServiceRtoPdf(supabase: SupabaseClient, reportId: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("RTO_STORAGE_UNAVAILABLE");

  const { data: report, error } = await supabase
    .from("field_service_rto_reports")
    .select("id, organization_id, service_order_id, snapshot, report_version")
    .eq("id", reportId)
    .single();
  const snapshot = report ? fieldServiceRtoSnapshotSchema.safeParse(report.snapshot) : null;
  if (error || !report || !snapshot?.success) throw new Error("RTO_SNAPSHOT_UNAVAILABLE");

  const pdf = await renderFieldServiceRtoPdf(snapshot.data);
  const hash = createHash("sha256").update(pdf).digest("hex");
  const path = `${report.organization_id}/field-service/${report.service_order_id}/rto-v${report.report_version}.pdf`;
  const storage = createStorageAdmin("ticket-reports");
  const { error: uploadError } = await storage.upload(path, pdf, { contentType: "application/pdf", upsert: true });
  if (uploadError) throw new Error("RTO_UPLOAD_FAILED");

  const { error: registrationError } = await supabase.rpc("register_field_service_rto_file", {
    target_report_id: report.id,
    target_storage_path: path,
    target_sha256: hash,
  });
  if (registrationError) throw new Error("RTO_REGISTER_FAILED");

  const { data: signed } = await storage.createSignedUrl(path, 300);
  return { reportId: report.id, downloadUrl: signed?.signedUrl ?? null };
}
