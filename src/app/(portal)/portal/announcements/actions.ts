"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { announcementIdSchema, announcementSchema } from "@/lib/validation/announcement";

export async function createAnnouncement(formData: FormData) {
  const parsed = announcementSchema.safeParse({ organizationId: formData.get("organizationId"), title: formData.get("title"), message: formData.get("message"), severity: formData.get("severity"), startsAt: formData.get("startsAt"), endsAt: formData.get("endsAt"), requiresAcknowledgement: formData.get("requiresAcknowledgement") === "true" });
  if (!parsed.success) redirect("/portal/announcements?message=Aviso+inv%C3%A1lido.");
  const { supabase } = await requireUser(); const value = parsed.data;
  const { error } = await supabase.rpc("create_announcement", { target_organization_id: value.organizationId, target_title: value.title, target_message: value.message, target_severity: value.severity, target_starts_at: value.startsAt.toISOString(), target_ends_at: value.endsAt.toISOString(), target_requires_acknowledgement: value.requiresAcknowledgement });
  if (error) redirect("/portal/announcements?message=N%C3%A3o+foi+poss%C3%ADvel+publicar+o+aviso.");
  revalidatePath("/portal/announcements"); redirect("/portal/announcements?message=Aviso+publicado+com+auditoria.");
}

export async function acknowledgeAnnouncement(formData: FormData) {
  const parsed = announcementIdSchema.safeParse({ announcementId: formData.get("announcementId") });
  if (!parsed.success) redirect("/portal/announcements?message=Aviso+inv%C3%A1lido.");
  const { supabase } = await requireUser(); const { error } = await supabase.rpc("acknowledge_announcement", { target_announcement_id: parsed.data.announcementId });
  if (error) redirect("/portal/announcements?message=O+aviso+n%C3%A3o+est%C3%A1+mais+dispon%C3%ADvel.");
  revalidatePath("/portal/announcements"); redirect("/portal/announcements?message=Leitura+confirmada.");
}
