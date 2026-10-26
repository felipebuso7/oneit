"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth/current-user";
import { ticketCommunicationSchema, ticketIdSchema, ticketTriageContextSchema } from "@/lib/validation/ticket";
import { ticketNumberRelationshipSchema } from "@/lib/validation/entity-relationship";

const ticketAssetSchema = z.object({
  ticketId: z.uuid(),
  assetId: z.uuid(),
  relationshipType: z.enum(["AFFECTED", "RELATED", "REPLACEMENT"]),
  notes: z.string().trim().max(2000).optional(),
});

export async function linkAssetToTicket(formData: FormData) {
  const parsed = ticketAssetSchema.safeParse({
    ticketId: formData.get("ticketId"),
    assetId: formData.get("assetId"),
    relationshipType: formData.get("relationshipType"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) redirect("/portal/tickets?message=Vínculo+de+ativo+inválido.");

  const { supabase, user } = await requireUser();
  const { data: ticket } = await supabase.from("tickets").select("organization_id").eq("id", parsed.data.ticketId).maybeSingle();
  if (!ticket) redirect("/portal/tickets?message=Chamado+não+encontrado.");

  const { error } = await supabase.from("ticket_assets").insert({
    ticket_id: parsed.data.ticketId,
    asset_id: parsed.data.assetId,
    organization_id: ticket.organization_id,
    relationship_type: parsed.data.relationshipType,
    notes: parsed.data.notes,
    created_by: user.id,
  });
  if (error) redirect(`/portal/tickets/${parsed.data.ticketId}?message=Não+foi+possível+vincular+o+ativo.`);

  revalidatePath(`/portal/tickets/${parsed.data.ticketId}`);
  redirect(`/portal/tickets/${parsed.data.ticketId}?message=Ativo+vinculado+ao+chamado.`);
}

export async function postTicketCommunication(formData: FormData) {
  const parsed = ticketCommunicationSchema.safeParse({ ticketId: formData.get("ticketId"), audience: formData.get("audience"), message: formData.get("message") });
  if (!parsed.success) redirect("/portal/tickets?message=Comunicação+inválida.");
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("post_ticket_communication", { target_ticket_id: parsed.data.ticketId, target_audience: parsed.data.audience, target_message: parsed.data.message });
  if (error) redirect(`/portal/tickets/${parsed.data.ticketId}?message=Não+foi+possível+registrar+a+comunicação.+Para+o+cliente,+vincule+um+solicitante+com+e-mail+verificado.`);
  revalidatePath(`/portal/tickets/${parsed.data.ticketId}`);
  redirect(`/portal/tickets/${parsed.data.ticketId}?message=${parsed.data.audience === "CUSTOMER" ? "Comunicação+registrada+e+enfileirada+para+e-mail." : "Comunicação+interna+registrada."}`);
}

export async function updateTicketTriageContext(formData: FormData) {
  const parsed = ticketTriageContextSchema.safeParse({ ticketId: formData.get("ticketId"), requesterCollaboratorId: formData.get("requesterCollaboratorId") || undefined, departmentUnitId: formData.get("departmentUnitId") || undefined, serviceOfferingId: formData.get("serviceOfferingId") || undefined });
  if (!parsed.success) redirect("/portal/tickets?message=Dados+de+triagem+inválidos.");
  const { supabase } = await requireUser();
  const value = parsed.data;
  const { error } = await supabase.rpc("update_ticket_triage_context", { target_ticket_id: value.ticketId, target_requester_collaborator_id: value.requesterCollaboratorId ?? null, target_department_unit_id: value.departmentUnitId ?? null, target_service_offering_id: value.serviceOfferingId ?? null });
  if (error) redirect(`/portal/tickets/${value.ticketId}?message=Não+foi+possível+aplicar+o+contexto+de+triagem.`);
  revalidatePath(`/portal/tickets/${value.ticketId}`);
  revalidatePath("/portal/tickets");
  redirect(`/portal/tickets/${value.ticketId}?message=Solicitante,+departamento+e+serviço+atualizados.`);
}

export async function linkTicketByNumber(formData: FormData) {
  const parsed = ticketNumberRelationshipSchema.safeParse({ ticketId: formData.get("ticketId"), parentTicketNumber: formData.get("parentTicketNumber"), relationshipType: formData.get("relationshipType"), reason: formData.get("reason") || undefined });
  if (!parsed.success) redirect("/portal/tickets?message=Dados+de+vínculo+inválidos.");
  const { supabase } = await requireUser();
  const value = parsed.data;
  const { data: source } = await supabase.from("tickets").select("organization_id").eq("id", value.ticketId).maybeSingle();
  if (!source) redirect("/portal/tickets?message=Chamado+não+encontrado.");
  const { data: parent } = await supabase.from("tickets").select("id").eq("organization_id", source.organization_id).eq("ticket_number", value.parentTicketNumber).maybeSingle();
  if (!parent) redirect(`/portal/tickets/${value.ticketId}?message=Número+do+chamado+pai+não+encontrado+na+mesma+organização.`);
  const { error } = await supabase.rpc("create_ticket_relationship", { target_organization_id: source.organization_id, target_source_ticket_id: value.ticketId, target_target_ticket_id: parent.id, target_relationship_type: value.relationshipType, target_reason: value.reason ?? null });
  if (error) redirect(`/portal/tickets/${value.ticketId}?message=Não+foi+possível+vincular.+O+chamado+pode+já+ter+um+pai+ou+grupo+definido.`);
  revalidatePath(`/portal/tickets/${value.ticketId}`);
  redirect(`/portal/tickets/${value.ticketId}?message=${value.relationshipType === "MASS_INCIDENT_PARENT" ? "Chamado+vinculado+ao+pai+do+incidente+em+massa." : "Conversa+agrupada+ao+chamado+principal."}`);
}

export async function recordFirstTicketResponse(formData: FormData) {
  const parsed = ticketIdSchema.safeParse({ ticketId: formData.get("ticketId") });
  if (!parsed.success) redirect("/portal/tickets?message=Chamado+inválido.");
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("record_ticket_first_response", { target_ticket_id: parsed.data.ticketId });
  if (error) redirect(`/portal/tickets/${parsed.data.ticketId}?message=Não+foi+possível+registrar+o+primeiro+atendimento.`);
  revalidatePath(`/portal/tickets/${parsed.data.ticketId}`);
  redirect(`/portal/tickets/${parsed.data.ticketId}?message=Primeiro+atendimento+registrado+no+SLA+e+histórico.`);
}
