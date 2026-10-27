"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/current-user";
import { scheduleTicketSchema } from "@/lib/validation/ticket";

export async function scheduleTicket(formData: FormData) {
  const parsed = scheduleTicketSchema.safeParse({
    ticketId: formData.get("ticketId"), technicianId: formData.get("technicianId"),
    plannedStart: formData.get("plannedStart"), plannedEnd: formData.get("plannedEnd"),
  });
  if (!parsed.success) redirect("/portal/scheduling?message=Dados+de+agenda+inválidos.");

  const { supabase } = await requireUser();
  const { data: ticket } = await supabase.from("tickets").select("organization_id").eq("id", parsed.data.ticketId).maybeSingle();
  const { data: mapping } = ticket ? await supabase.from("field_service_technicians").select("id").eq("organization_id", ticket.organization_id).eq("operational_technician_id", parsed.data.technicianId).eq("active", true).maybeSingle() : { data: null };
  if (!ticket || !mapping) redirect("/portal/scheduling?message=Técnico+sem+vínculo+operacional+ativo+para+esta+organização.");
  const { error } = await supabase.rpc("schedule_ticket", {
    target_ticket_id: parsed.data.ticketId, target_technician_id: parsed.data.technicianId,
    target_start: parsed.data.plannedStart.toISOString(), target_end: parsed.data.plannedEnd.toISOString(),
  });
  if (error) redirect("/portal/scheduling?message=Não+foi+possível+agendar.+Verifique+conflitos+e+permissões.");
  revalidatePath("/portal/scheduling"); revalidatePath("/portal/tickets");
  redirect("/portal/scheduling?message=Agenda+criada.+Atribua+o+técnico+para+liberar+a+OS.");
}

export async function assignTicket(formData: FormData) {
  const ticketId = String(formData.get("ticketId") ?? "");
  const technicianId = String(formData.get("technicianId") ?? "");
  const { supabase } = await requireUser();
  const { data: ticket } = await supabase.from("tickets").select("organization_id").eq("id", ticketId).maybeSingle();
  const { data: mapping } = ticket ? await supabase.from("field_service_technicians").select("id").eq("organization_id", ticket.organization_id).eq("operational_technician_id", technicianId).eq("active", true).maybeSingle() : { data: null };
  if (!ticket || !mapping) redirect("/portal/scheduling?message=Técnico+sem+vínculo+operacional+ativo+para+esta+organização.");
  const { error } = await supabase.rpc("assign_ticket", { target_ticket_id: ticketId, target_technician_id: technicianId });
  if (error) redirect("/portal/scheduling?message=Não+foi+possível+atribuir+a+OS.");
  revalidatePath("/portal/scheduling"); revalidatePath("/portal/tickets");
  redirect("/portal/scheduling?message=OS+atribuída+ao+técnico.");
}
