import { requireUser } from "@/lib/auth/current-user";

function cell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function GET() {
  const { supabase, user } = await requireUser();
  const { data: roles, error: roleError } = await supabase.from("user_roles").select("organization_id").eq("user_id", user.id);
  if (roleError) return Response.json({ code: "EXPORT_AUTHORIZATION_UNAVAILABLE" }, { status: 503 });
  const organizationIds = [...new Set((roles ?? []).map((role) => role.organization_id))];
  if (!organizationIds.length) return Response.json({ code: "EXPORT_NOT_AUTHORIZED" }, { status: 403 });
  const { data, error } = await supabase.from("tickets").select("ticket_number,servicenow_number,title,operational_status,administrative_status,priority,category_code,service_type_code,scheduled_at,created_at,closed_at,customer_id,location_id,assigned_technician_id").in("organization_id", organizationIds).in("operational_status", ["CLOSED", "COMPLETED"]).order("closed_at", { ascending: false });
  if (error) return Response.json({ code: "TICKET_EXPORT_UNAVAILABLE" }, { status: 503 });
  const header = ["Chamado", "ServiceNow", "Título", "Situação operacional", "Situação administrativa", "Prioridade", "Categoria", "Serviço", "Agendamento", "Abertura", "Encerramento", "Cliente", "Localidade", "Técnico"];
  const rows = (data ?? []).map((ticket) => [ticket.ticket_number, ticket.servicenow_number, ticket.title, ticket.operational_status, ticket.administrative_status, ticket.priority, ticket.category_code, ticket.service_type_code, ticket.scheduled_at, ticket.created_at, ticket.closed_at, ticket.customer_id, ticket.location_id, ticket.assigned_technician_id].map(cell).join(";"));
  return new Response("\uFEFF" + [header.map(cell).join(";"), ...rows].join("\n"), { headers: { "Content-Type": "text/csv;charset=utf-8", "Content-Disposition": "attachment; filename=oneit-chamados-encerrados.csv", "Cache-Control": "private, no-store" } });
}
