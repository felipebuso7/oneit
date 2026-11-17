"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertTransition, type OperationalStatus } from "@/domain/tickets/state-machine";
import { requireUser } from "@/lib/auth/current-user";
import { createTicketSchema, transitionTicketSchema } from "@/lib/validation/ticket";
import { createStorageAdmin } from "@/lib/supabase/storage-admin";
import { MAX_EVIDENCE_BYTES, validateEvidenceBytes } from "@/lib/validation/evidence";

function ticketCreationMessage(message: string | undefined): string {
  if (message?.includes("TICKET_INITIAL_STATE_REQUIRED")) return "O chamado não pôde ser aberto porque o estado inicial está inconsistente. Recarregue a tela e tente novamente.";
  if (message?.includes("TICKET_REQUESTER_INVALID")) return "Solicitante inválido ou inativo para esta organização.";
  if (message?.includes("TICKET_DEPARTMENT_INVALID")) return "Departamento inválido ou inativo para esta organização.";
  if (message?.includes("TICKET_SERVICE_OFFERING_INVALID")) return "O serviço selecionado está inativo ou não pertence à organização do chamado.";
  if (message?.includes("TICKET_CATEGORY_INVALID")) return "A categoria do serviço está inativa ou não pertence à organização do chamado.";
  if (message?.includes("TICKET_SUBCATEGORY_INVALID")) return "A subcategoria do serviço está inativa ou não pertence à categoria selecionada.";
  if (message?.includes("Ticket customer must belong")) return "O cliente selecionado não pertence à organização escolhida.";
  if (message?.includes("Ticket contract must belong")) return "O contrato selecionado não pertence ao cliente escolhido.";
  if (message?.includes("Ticket location must belong")) return "A localidade selecionada não pertence ao cliente escolhido.";
  if (message?.toLowerCase().includes("servicenow") || message?.includes("tickets_organization_id_servicenow_id_key")) return "Já existe um chamado com essa referência ServiceNow nesta organização.";
  if (message?.includes("foreign key") || message?.includes("ticket_service_offering")) return "Cliente, localidade, contrato ou serviço não pertence à organização selecionada.";
  if (message?.includes("duplicate key") || message?.includes("unique constraint")) return "Já existe um registro com a mesma referência. Confira o número externo e tente novamente.";
  if (message?.includes("permission denied") || message?.includes("row-level security")) return "Seu perfil não tem permissão para abrir chamados nesta organização.";
  return "Não foi possível abrir o chamado. Revise os dados e tente novamente.";
}

function ticketValidationMessage(issues: { path: PropertyKey[]; message: string }[]): string {
  const labels: Record<string, string> = {
    organizationId: "organização", customerId: "cliente", locationId: "localidade", ticketType: "tipo",
    title: "assunto", description: "descrição", impact: "impacto", urgency: "urgência", serviceOfferingId: "serviço",
  };
  const fields = [...new Set(issues.map((issue) => labels[String(issue.path[0])] ?? String(issue.path[0])))].filter(Boolean);
  return fields.length ? `Dados inválidos: confira ${fields.join(", ")}.` : "Dados do chamado inválidos. Revise os campos obrigatórios.";
}

export async function createTicket(formData: FormData) {
  const parsed = createTicketSchema.safeParse({
    organizationId: formData.get("organizationId"), servicenowNumber: formData.get("servicenowNumber") || undefined, servicenowOpenedAt: formData.get("servicenowOpenedAt") || undefined, customerId: formData.get("customerId"),
    contractId: formData.get("contractId") || undefined, serviceOfferingId: formData.get("serviceOfferingId") || undefined, requesterCollaboratorId: formData.get("requesterCollaboratorId") || undefined, departmentUnitId: formData.get("departmentUnitId") || undefined, ticketType: formData.get("ticketType"), locationId: formData.get("locationId"),
    title: formData.get("title"), description: formData.get("description"), requesterContactPhone: formData.get("requesterContactPhone") || undefined, impact: formData.get("impact"), urgency: formData.get("urgency"),
  });
  if (!parsed.success) redirect(`/portal/tickets?message=${encodeURIComponent(ticketValidationMessage(parsed.error.issues))}`);

  const files = formData.getAll("attachments").filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length > 5 || files.some((file) => file.size > MAX_EVIDENCE_BYTES)) redirect("/portal/tickets?message=Envie+até+5+fotos+de+até+4+MB+cada.");
  if (files.length && !process.env.SUPABASE_SERVICE_ROLE_KEY) redirect("/portal/tickets?message=O+armazenamento+de+fotos+do+chamado+não+está+configurado.");

  const { supabase } = await requireUser();
  const { data: createdTicket, error } = await supabase.from("tickets").insert({
    organization_id: parsed.data.organizationId, servicenow_number: parsed.data.servicenowNumber || null, servicenow_opened_at: parsed.data.servicenowOpenedAt || null, customer_id: parsed.data.customerId,
    contract_id: parsed.data.contractId, service_offering_id: parsed.data.serviceOfferingId, requester_collaborator_id: parsed.data.requesterCollaboratorId, department_unit_id: parsed.data.departmentUnitId, location_id: parsed.data.locationId,
    title: parsed.data.title, description: parsed.data.description, requester_contact_phone: parsed.data.requesterContactPhone || null, impact: parsed.data.impact,
    urgency: parsed.data.urgency, ticket_type: parsed.data.ticketType,
  }).select("id,ticket_number").single();
  if (error || !createdTicket) redirect(`/portal/tickets?message=${encodeURIComponent(ticketCreationMessage(error?.message))}`);
  if (files.length) {
    const storage = createStorageAdmin("ticket-attachments");
    for (const file of files) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let mime: string;
      try { mime = validateEvidenceBytes(bytes, file.type); } catch { redirect("/portal/tickets?message=Uma+das+fotos+é+inválida.+Use+JPEG,+PNG+ou+WebP."); }
      const extension = mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : "webp";
      const storagePath = `${parsed.data.organizationId}/${createdTicket.id}/${crypto.randomUUID()}.${extension}`;
      const uploaded = await storage.upload(storagePath, bytes, { contentType: mime, upsert: false });
      if (uploaded.error) redirect("/portal/tickets?message=O+chamado+foi+salvo,+mas+não+foi+possível+salvar+uma+das+fotos.");
      const { error: attachmentError } = await supabase.from("ticket_attachments").insert({ ticket_id: createdTicket.id, organization_id: parsed.data.organizationId, storage_path: storagePath, file_name: file.name.slice(0, 180), mime_type: mime, size_bytes: bytes.length });
      if (attachmentError) { await storage.remove([storagePath]); redirect("/portal/tickets?message=O+chamado+foi+salvo,+mas+não+foi+possível+registrar+uma+das+fotos."); }
    }
  }
  revalidatePath("/portal/tickets");
  redirect(`/portal/tickets?message=${encodeURIComponent(`Chamado ${createdTicket.ticket_number} aberto e salvo na fila.`)}`);
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

export async function cancelTicket(formData: FormData) {
  const ticketId = String(formData.get("ticketId") ?? "");
  const version = Number(formData.get("version"));
  const reason = String(formData.get("reason") ?? "").trim();
  if (!ticketId || !Number.isInteger(version) || version < 1) {
    redirect("/portal/tickets?message=Não foi possível identificar o chamado para cancelamento.");
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("cancel_ticket", {
    target_ticket_id: ticketId,
    expected_version: version,
    target_reason: reason || null,
  });
  if (error) {
    if (error.message.includes("TICKET_VERSION_CONFLICT")) redirect("/portal/tickets?message=O chamado foi alterado por outra pessoa. Recarregue a fila e tente novamente.");
    if (error.message.includes("TICKET_CANCEL_NOT_ALLOWED")) redirect("/portal/tickets?message=Este chamado já iniciou o atendimento e não pode ser removido da fila.");
    if (error.message.includes("TICKET_CLOSED_MASTER_ONLY")) redirect("/portal/tickets?message=Chamados encerrados só podem ser excluídos pelo Administrador Master.");
    if (error.message.includes("TICKET_NOT_AUTHORIZED")) redirect("/portal/tickets?message=Seu perfil não pode remover este chamado da fila.");
    redirect("/portal/tickets?message=Não foi possível remover o chamado da fila.");
  }
  revalidatePath("/portal/tickets");
  revalidatePath("/portal/field-service");
  redirect("/portal/tickets?message=Chamado removido da fila e cancelado com histórico preservado.");
}
