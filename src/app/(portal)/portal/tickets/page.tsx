import { TicketIntakeForm } from "@/components/tickets/ticket-intake-form";
import { TicketsTable } from "@/components/tickets/tickets-table";
import { requireUser } from "@/lib/auth/current-user";
import { listAvailableCustomers } from "@/lib/customers/queries";
import { listAvailableOrganizations } from "@/lib/organizations/queries";
import { OneitPageHeader } from "@/components/oneit";

type PageProps = { searchParams: Promise<{ message?: string }> };

export default async function TicketsPage({ searchParams }: PageProps) {
  const [{ supabase }, organizations, customers, { message }] = await Promise.all([requireUser(), listAvailableOrganizations(), listAvailableCustomers(), searchParams]);
  const organizationIds = organizations.map((item) => item.id);
  const [{ data: contracts }, { data: locations }, { data: categories }, { data: subcategories }, { data: offerings }, { data: collaborators }, { data: departments }, { data: tickets }] = await Promise.all([
    organizationIds.length ? supabase.from("contracts").select("id, organization_id, customer_id, code, name").in("organization_id", organizationIds).eq("active", true).order("name") : Promise.resolve({ data: [] }),
    organizationIds.length ? supabase.from("customer_locations").select("id, organization_id, customer_id, name, city").in("organization_id", organizationIds).eq("active", true).order("name") : Promise.resolve({ data: [] }),
    organizationIds.length ? supabase.from("service_categories").select("id, organization_id, name").in("organization_id", organizationIds).eq("active", true).order("name") : Promise.resolve({ data: [] }),
    organizationIds.length ? supabase.from("service_subcategories").select("id, category_id, name").eq("active", true).order("name") : Promise.resolve({ data: [] }),
    organizationIds.length ? supabase.from("service_offerings").select("id, subcategory_id, code, name").eq("active", true).order("name") : Promise.resolve({ data: [] }),
    organizationIds.length ? supabase.from("collaborators").select("id, organization_id, full_name").in("organization_id", organizationIds).eq("status", "ACTIVE").order("full_name") : Promise.resolve({ data: [] }),
    organizationIds.length ? supabase.from("organization_units").select("id, organization_id, name").in("organization_id", organizationIds).eq("unit_type", "DEPARTMENT").eq("active", true).order("name") : Promise.resolve({ data: [] }),
    organizationIds.length ? supabase.from("tickets").select("id, ticket_number, title, ticket_type, priority, operational_status, administrative_status, created_at, category_code, service_type_code").in("organization_id", organizationIds).order("created_at", { ascending: false }).limit(500) : Promise.resolve({ data: [] }),
  ]);
  const ticketIds = (tickets ?? []).map((ticket) => ticket.id);
  const { data: serviceLevels } = ticketIds.length ? await supabase.from("ticket_service_levels").select("ticket_id,resolution_due_at").in("ticket_id", ticketIds) : { data: [] };
  const levelByTicketId = new Map((serviceLevels ?? []).map((level) => [level.ticket_id, level.resolution_due_at]));

  return <section className="mx-auto max-w-6xl p-5 sm:p-8"><OneitPageHeader eyebrow="Operação" title="Chamados" description="Abertura com classificação de serviço, política de prioridade e validação de vínculos organizacionais." />{message ? <p role="status" className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">{message}</p> : null}
    <TicketIntakeForm organizations={organizations} customers={customers} contracts={contracts ?? []} locations={locations ?? []} categories={categories ?? []} subcategories={subcategories ?? []} offerings={offerings ?? []} collaborators={collaborators ?? []} departments={departments ?? []} />
    <TicketsTable tickets={(tickets ?? []).map((ticket) => ({ ...ticket, resolution_due_at: levelByTicketId.get(ticket.id) ?? null }))} />
  </section>;
}
