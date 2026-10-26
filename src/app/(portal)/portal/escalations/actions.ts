"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { ticketEscalationSchema } from "@/lib/validation/support-groups";

export async function escalateTicket(formData: FormData) {
  const parsed = ticketEscalationSchema.safeParse({ ticketId: formData.get("ticketId"), targetGroupId: formData.get("targetGroupId"), escalationType: formData.get("escalationType"), reason: formData.get("reason"), technicalSummary: formData.get("technicalSummary") || undefined });
  if (!parsed.success) redirect("/portal/escalations?message=Dados+de+escalonamento+inválidos.");
  const { supabase } = await requireUser(); const value = parsed.data;
  const { error } = await supabase.rpc("escalate_ticket", { target_ticket_id: value.ticketId, target_group_id: value.targetGroupId, target_escalation_type: value.escalationType, target_reason: value.reason, target_technical_summary: value.technicalSummary ?? null });
  if (error) redirect("/portal/escalations?message=Não+foi+possível+escalonar.+No+escalonamento+funcional,+o+nível+de+destino+deve+ser+superior.");
  revalidatePath("/portal/escalations"); revalidatePath("/portal/tickets"); redirect("/portal/escalations?message=Escalonamento+registrado+com+auditoria.");
}
