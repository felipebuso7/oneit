"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertTransition, type OperationalStatus } from "@/domain/tickets/state-machine";
import { requireUser } from "@/lib/auth/current-user";
import { createTicketSchema, transitionTicketSchema } from "@/lib/validation/ticket";

function ticketCreationMessage(message: string | undefined): string {
  if (message?.includes("TICKET_REQUESTER_INVALID")) return "Solicitante inválido ou inativo para esta organização.";
  if (message?.includes("TICKET_DEPARTMENT_INVALID")) return "Departamento inválido ou inativo para esta organização.";
  if (message?.toLowerCase().includes("servicenow") || message?.includes("tickets_organization_id_servicenow_id_key")) return "Já existe um chamado com essa referência ServiceNow nesta organização.";
  if (message?.includes("foreign key") || message?.includes("ticket_service_offering")) return "Cliente, localidade, contrato ou serviço não pertence à organização selecionada.";
  return "Não foi possível abrir o chamado. Revise os dados e tente novamente.";
}

export async function createTicket(formData: FormData) {
  const parsed = createTicketSchema.safeParse({
    organizationId: formData.get("organizationId"), servicenowNumber: formData.get("servicenowNumber") || undefined, customerId: formData.get("customerId"),
    contractId: formData.get("contractId") || undefined, serviceOfferingId: formData.get("serviceOfferingId") || undefined, requesterCollaboratorId: formData.get("requesterCollaboratorId") || undefined, departmentUnitId: formData.get("departmentUnitId") || undefined, ticketType: formData.get("ticketType"), locationId: formData.get("locationId"),
    title: formData.get("title"), description: formData.get("description"), impact: formData.get("impact"), urgency: formData.get("urgency"),
  });
  if (!parsed.success) redirect("/portal/tickets?message=Dados+do+chamado+inválidos.");

  const { supabase } = await requireUser();
  const { error } = await supabase.from("tickets").insert({
    organization_id: parsed.data.organizationId, servicenow_number: parsed.data.servicenowNumber || null, customer_id: parsed.data.customerId,
    contract_id: parsed.data.contractId, service_offering_id: parsed.data.serviceOfferingId, requester_collaborator_id: parsed.data.requesterCollaboratorId, department_unit_id: parsed.data.departmentUnitId, location_id: parsed.data.locationId,
    title: parsed.data.title, description: parsed.data.description, impact: parsed.data.impact,
    urgency: parsed.data.urgency, ticket_type: parsed.data.ticketType,
  });
  if (error) redirect(`/portal/tickets?message=${encodeURIComponent(ticketCreationMessage(error.message))}`);
  revalidatePath("/portal/tickets"); redirect("/portal/tickets?message=Chamado+aberto.");
}

export async function sendToTriage(formData: FormData) {
  const parsed = transitionTicketSchema.safeParse({ ticketId: formData.get("ticketId"), targetStatus: "TRIAGE" });
  if (!parsed.success) redirect("/portal/tickets?message=Transição+inválida.");
  const { supabase } = await requireUser();
  const { data: ticket, error: readError } = await supabase.from("tickets").select("operational_status, version").eq("id", parsed.data.ticketId).single();
  if (readError || !ticket) redirect("/portal/tickets?message=Chamado+não+encontrado.");

  assertTransition(ticket.operational_status as OperationalStatus, parsed.data.targetStatus);
  const { error } = await supabase.rpc("triage_ticket", { target_ticket_id: parsed.data.ticketId, expected_version: ticket.version, target_status: "TRIAGE" });
  if (error) redirect("/portal/tickets?message=O+chamado+foi+alterado+por+outra+pessoa.+Recarregue+a+tela.");
  revalidatePath("/portal/tickets"); redirect("/portal/tickets?message=Chamado+enviado+para+triagem.");
}

export async function awaitScheduling(formData: FormData) {
  const ticketId = String(formData.get("ticketId") ?? "");
  const { supabase } = await requireUser();
  const { data: ticket } = await supabase.from("tickets").select("operational_status, version").eq("id", ticketId).single();
  if (!ticket || ticket.operational_status !== "TRIAGE") redirect("/portal/tickets?message=Chamado+indisponível+para+agendamento.");
  const { error } = await supabase.rpc("triage_ticket", { target_ticket_id: ticketId, expected_version: ticket.version, target_status: "AWAITING_SCHEDULING" });
  if (error) redirect("/portal/tickets?message=Não+foi+possível+atualizar+o+chamado.");
  revalidatePath("/portal/tickets"); redirect("/portal/tickets?message=Chamado+pronto+para+agendamento.");
}
