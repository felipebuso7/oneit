"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { createStorageAdmin } from "@/lib/supabase/storage-admin";
import { evidenceSchema, materialUsageSchema, MAX_EVIDENCE_BYTES, validateEvidenceBytes } from "@/lib/validation/evidence";

export async function addMaterial(formData: FormData) {
  const parsed = materialUsageSchema.safeParse({ ticketId: formData.get("ticketId"), materialId: formData.get("materialId"), quantity: formData.get("quantity") });
  if (!parsed.success) redirect("/portal/field?message=Material+ou+quantidade+inválidos.");
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("add_ticket_material", { target_ticket_id: parsed.data.ticketId, target_material_id: parsed.data.materialId, target_quantity: parsed.data.quantity });
  if (error) redirect("/portal/field?message=Não+foi+possível+registrar+o+material.");
  revalidatePath("/portal/field"); redirect("/portal/field?message=Material+registrado.");
}

export async function uploadEvidence(formData: FormData) {
  const parsed = evidenceSchema.safeParse({ ticketId: formData.get("ticketId"), evidenceType: formData.get("evidenceType") });
  const file = formData.get("file");
  if (!parsed.success || !(file instanceof File) || !file.size || file.size > MAX_EVIDENCE_BYTES) redirect("/portal/field?message=Selecione+uma+foto+válida+de+até+4+MB.");
  const { supabase, user } = await requireUser();
  const { data: ticket } = await supabase.from("tickets").select("organization_id, assigned_technician_id, operational_status").eq("id", parsed.data.ticketId).single();
  const { data: technician } = await supabase.from("technicians").select("id").eq("user_id", user.id).eq("active", true).maybeSingle();
  const { data: allowed } = technician ? await supabase.rpc("is_ticket_assigned_to_current_user", { target_technician_id: technician.id }) : { data: false };
  if (!ticket || !technician || !allowed || ticket.assigned_technician_id !== technician.id || !["ON_SITE", "WORK_STARTED", "IN_PROGRESS"].includes(ticket.operational_status)) redirect("/portal/field?message=Você+não+pode+adicionar+evidências+a+esta+OS.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  let mime: string;
  try { mime = validateEvidenceBytes(bytes, file.type); }
  catch { redirect("/portal/field?message=Foto+inválida.+Use+JPEG,+PNG+ou+WebP."); }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) redirect("/portal/field?message=Upload+indisponível.+Contate+o+administrador.");
  const storage = createStorageAdmin();
  const extension = mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : "webp";
  const path = `${ticket.organization_id}/${parsed.data.ticketId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await storage.upload(path, bytes, { contentType: mime, upsert: false });
  if (uploadError) redirect("/portal/field?message=Upload+não+concluído.+Tente+novamente.");
  const { error } = await supabase.rpc("register_ticket_evidence", { target_ticket_id: parsed.data.ticketId, target_type: parsed.data.evidenceType, target_path: path, target_mime: mime, target_size: bytes.length });
  if (error) {
    const { error: cleanupError } = await storage.remove([path]);
    if (cleanupError) console.error("Evidence cleanup pending", { path, code: cleanupError.name });
    redirect("/portal/field?message=Foto+não+registrada.+Recarregue+a+OS+e+tente+novamente.");
  }
  revalidatePath("/portal/field"); redirect("/portal/field?message=Evidência+registrada.");
}
