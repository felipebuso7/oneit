"use server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { createStorageAdmin } from "@/lib/supabase/storage-admin";
import { renderTicketPdf, reportSnapshotSchema, type ReportEvidenceImage } from "@/domain/reports/pdf";

const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;

export async function generateReport(formData: FormData) {
  const ticketId = z.uuid().safeParse(formData.get("ticketId"));
  if (!ticketId.success) redirect("/portal/reports?message=OS+inválida.");
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("prepare_ticket_report", { target_ticket_id: ticketId.data });
  const parsed = reportSnapshotSchema.safeParse(data);
  if (error || !parsed.success) redirect("/portal/reports?message=Relatório+indisponível.+Verifique+aprovação+e+permissão.");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) redirect("/portal/reports?message=Armazenamento+do+relatório+não+configurado.");
  const storage = createStorageAdmin("ticket-reports");
  const evidenceStorage = createStorageAdmin("ticket-evidences");
  const evidenceImages: ReportEvidenceImage[] = [];
  for (const evidence of parsed.data.evidences.slice(0, 8)) {
    if (!evidence.storagePath) continue;
    const { data: file } = await evidenceStorage.download(evidence.storagePath);
    if (!file) continue;
    if (file.size > MAX_EVIDENCE_BYTES) continue;
    const mimeType = file.type === "image/png" ? "image/png" : file.type === "image/jpeg" ? "image/jpeg" : null;
    if (!mimeType) continue;
    evidenceImages.push({ mimeType, bytes: new Uint8Array(await file.arrayBuffer()) });
  }
  const bytes = await renderTicketPdf(parsed.data, evidenceImages);
  const path = `${parsed.data.organizationId}/${ticketId.data}/${crypto.randomUUID()}.pdf`;
  const { error: uploadError } = await storage.upload(path, bytes, { contentType: "application/pdf", upsert: false });
  if (uploadError) redirect("/portal/reports?message=PDF+não+armazenado.+Tente+novamente.");
  const { error: registerError } = await supabase.rpc("register_ticket_report", {
    target_ticket_id: ticketId.data, expected_version: parsed.data.ticketVersion,
    target_report_version: parsed.data.reportVersion, target_snapshot: parsed.data, target_path: path,
    target_sha256: createHash("sha256").update(bytes).digest("hex"),
  });
  if (registerError) {
    const { error: cleanupError } = await storage.remove([path]);
    if (cleanupError) console.error("Report cleanup pending", { path, code: cleanupError.name });
    redirect("/portal/reports?message=OS+alterada+ou+registro+não+concluído.+Recarregue+e+tente+novamente.");
  }
  revalidatePath("/portal/reports"); revalidatePath("/portal/tickets");
  redirect("/portal/reports?message=PDF+gerado+e+versionado.");
}
