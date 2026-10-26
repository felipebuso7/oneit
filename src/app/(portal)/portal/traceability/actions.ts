"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { ticketRelationshipSchema } from "@/lib/validation/entity-relationship";

export async function createTicketRelationship(formData: FormData) {
  const parsed = ticketRelationshipSchema.safeParse({ organizationId: formData.get("organizationId"), sourceTicketId: formData.get("sourceTicketId"), targetTicketId: formData.get("targetTicketId"), relationshipType: formData.get("relationshipType"), reason: formData.get("reason") || undefined });
  if (!parsed.success) redirect("/portal/traceability?message=Dados+de+relacionamento+inválidos.");
  const { supabase } = await requireUser(); const value = parsed.data;
  const { error } = await supabase.rpc("create_ticket_relationship", { target_organization_id: value.organizationId, target_source_ticket_id: value.sourceTicketId, target_target_ticket_id: value.targetTicketId, target_relationship_type: value.relationshipType, target_reason: value.reason ?? null });
  if (error) redirect("/portal/traceability?message=Não+foi+possível+criar+o+relacionamento.+Verifique+a+organização,+a+permissão+e+os+chamados.");
  revalidatePath("/portal/traceability"); redirect("/portal/traceability?message=Relacionamento+registrado+com+auditoria.");
}
