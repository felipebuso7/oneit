import { createHash } from "node:crypto";

import { fieldServiceRtoSnapshotSchema, renderFieldServiceRtoPdf, type ReportEvidenceImage } from "@/domain/reports/pdf";
import { normalizeEvidenceImage } from "@/lib/reports/normalize-evidence-image";
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

  const evidenceStorage = createStorageAdmin("ticket-evidences");
  const evidenceImages: ReportEvidenceImage[] = [];
  for (const evidence of snapshot.data.evidence.slice(0, 8)) {
    if (!evidence || typeof evidence !== "object") continue;
    const item = evidence as { storagePath?: unknown; mime?: unknown };
    if (typeof item.storagePath !== "string" || typeof item.mime !== "string") continue;
    if (!new RegExp(`^partner/${report.service_order_id}/[0-9a-f-]+\\.(jpg|png|webp)$`, "i").test(item.storagePath)) continue;
    const { data: file } = await evidenceStorage.download(item.storagePath);
    if (!file || file.size > 4 * 1024 * 1024) continue;
    try {
      evidenceImages.push(await normalizeEvidenceImage(new Uint8Array(await file.arrayBuffer()), item.mime));
    } catch {
      // Uma evidência corrompida não impede a emissão das demais fotos.
    }
  }
  const pdf = await renderFieldServiceRtoPdf(snapshot.data, evidenceImages);
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
  if (!signed?.signedUrl) throw new Error("RTO_DOWNLOAD_UNAVAILABLE");
  return { reportId: report.id, downloadUrl: signed.signedUrl };
}
