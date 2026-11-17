import { TicketCreateFlow } from "@/components/tickets/ticket-create-flow";
import { loadTicketFieldProgress } from "@/lib/field-service/ticket-progress-query";
import { TicketsTable } from "@/components/tickets/tickets-table";
import { requireUser } from "@/lib/auth/current-user";
import { listAvailableCustomers } from "@/lib/customers/queries";
import { listAvailableOrganizations } from "@/lib/organizations/queries";
import { OneitPageHeader } from "@/components/oneit";

type PageProps = { searchParams: Promise<{ message?: string }> };

export default async function TicketsPage({ searchParams }: PageProps) {
  const [{ supabase }, organizations, customers, { message }] = await Promise.all([requireUser(), listAvailableOrganizations(), listAvailableCustomers(), searchParams]);
  const organizationIds = organizations.map((item) => item.id);
  const [{ data: contracts }, { data: locations }, { data: categories }, { data: collaborators }, { data: departments }, ticketResult] = await Promise.all([
    organizationIds.length ? supabase.from("contracts").select("id, organization_id, customer_id, code, name").in("organization_id", organizationIds).eq("active", true).order("name") : Promise.resolve({ data: [] }),
    organizationIds.length ? supabase.from("customer_locations").select("id, organization_id, customer_id, name, city").in("organization_id", organizationIds).eq("active", true).order("name") : Promise.resolve({ data: [] }),
    organizationIds.length ? supabase.from("service_categories").select("id, organization_id, name").in("organization_id", organizationIds).eq("active", true).order("name") : Promise.resolve({ data: [] }),
    organizationIds.length ? supabase.from("collaborators").select("id, organization_id, full_name").in("organization_id", organizationIds).eq("status", "ACTIVE").order("full_name") : Promise.resolve({ data: [] }),
    organizationIds.length ? supabase.from("organization_units").select("id, organization_id, name").in("organization_id", organizationIds).eq("unit_type", "DEPARTMENT").eq("active", true).order("name") : Promise.resolve({ data: [] }),
    organizationIds.length ? supabase.from("tickets").select("id, ticket_number, servicenow_number, servicenow_opened_at, customer_id, location_id, assigned_technician_id, scheduled_at, title, ticket_type, priority, operational_status, administrative_status, created_at, category_code, service_type_code, version").in("organization_id", organizationIds).neq("operational_status", "CANCELLED").order("created_at", { ascending: false }).limit(500) : Promise.resolve({ data: [], error: null }),
  ]);
  // Keep the operational queue available while an older production schema is
  // being upgraded. The optional ServiceNow opening-date column was added
  // later; if that one column is not present yet, retry the same tenant-scoped
  // query without it instead of presenting an empty/broken queue.
  let tickets = ticketResult.data;
  let ticketsError = ticketResult.error;
  if (ticketsError && organizationIds.length) {
    const fallback = await supabase.from("tickets").select("id, ticket_number, servicenow_number, customer_id, location_id, assigned_technician_id, scheduled_at, title, ticket_type, priority, operational_status, administrative_status, created_at, category_code, service_type_code, version").in("organization_id", organizationIds).neq("operational_status", "CANCELLED").order("created_at", { ascending: false }).limit(500);
    tickets = (fallback.data ?? []).map((ticket) => ({ ...ticket, servicenow_opened_at: null }));
    ticketsError = fallback.error;
  }
  // O catálogo é hierárquico. Carregar os níveis inferiores sem restringir pelos
  // IDs do nível anterior permitia que opções de outra organização aparecessem
  // no formulário (e falhassem somente ao salvar). Cada seletor agora consome
  // exclusivamente a cadeia persistida que o usuário pode utilizar.
  const categoryIds = (categories ?? []).map((item) => item.id);
  const { data: subcategories } = categoryIds.length
    ? await supabase.from("service_subcategories").select("id, category_id, name").in("category_id", categoryIds).eq("active", true).order("name")
    : { data: [] };
  const subcategoryIds = (subcategories ?? []).map((item) => item.id);
  const { data: offerings } = subcategoryIds.length
    ? await supabase.from("service_offerings").select("id, subcategory_id, code, name").in("subcategory_id", subcategoryIds).eq("active", true).order("name")
    : { data: [] };
  const technicianIds = [...new Set((tickets ?? []).map((ticket) => ticket.assigned_technician_id).filter(Boolean))];
  const { data: technicians } = technicianIds.length ? await supabase.from("technicians").select("id,full_name").in("id", technicianIds) : { data: [] };
  const technicianById = new Map((technicians ?? []).map((technician) => [technician.id, technician.full_name]));
  const fieldProgressByTicket = await loadTicketFieldProgress(supabase, tickets ?? []);
  const ticketIds = (tickets ?? []).map((ticket) => ticket.id);
  const { data: serviceLevels } = ticketIds.length ? await supabase.from("ticket_service_levels").select("ticket_id,resolution_due_at").in("ticket_id", ticketIds) : { data: [] };
  const levelByTicketId = new Map((serviceLevels ?? []).map((level) => [level.ticket_id, level.resolution_due_at]));

  const customerById = new Map(customers.map((customer) => [customer.id, customer.name]));
  const locationById = new Map((locations ?? []).map((location) => [location.id, `${location.name} · ${location.city}`]));

  return <section className="oneit-page-shell mx-auto max-w-6xl p-5 sm:p-8"><div className="oneit-page-heading-row"><OneitPageHeader eyebrow="Operação" title="Chamados" description="Acompanhe a fila e abra solicitações pelo catálogo de serviços." /><TicketCreateFlow organizations={organizations} customers={customers} contracts={contracts ?? []} locations={locations ?? []} categories={categories ?? []} subcategories={subcategories ?? []} offerings={offerings ?? []} collaborators={collaborators ?? []} departments={departments ?? []} /></div>{message ? <p role="status" className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">{message}</p> : null}{ticketsError ? <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">A fila não pôde ser carregada pelo banco de dados. Nenhum chamado foi descartado; atualize a tela ou verifique sua organização e permissão.</p> : null}
    <TicketsTable tickets={(tickets ?? []).map((ticket) => ({ ...ticket, technician_name: ticket.assigned_technician_id ? technicianById.get(ticket.assigned_technician_id) ?? "Técnico não encontrado" : null, field_progress: fieldProgressByTicket.get(ticket.id) ?? null, customer_name: customerById.get(ticket.customer_id) ?? "Cliente não identificado", location_name: locationById.get(ticket.location_id) ?? "Local não informado", resolution_due_at: levelByTicketId.get(ticket.id) ?? null }))} />
  </section>;
}
