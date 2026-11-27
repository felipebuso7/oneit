import { requireUser } from "@/lib/auth/current-user";
import { OneitEmptyState, OneitPageHeader } from "@/components/oneit";
import { countUnlinkedActiveTechnicians, resolveDispatchTechnicians, withMissingOperationalMappings } from "@/lib/field-service/technician-eligibility";
import { DispatchWorkspace } from "./dispatch-workspace";

type PageProps = { searchParams: Promise<{ ticket?: string }> };

export default async function FieldServicePage({ searchParams }: PageProps) {
  const { ticket: initialTicketId } = await searchParams;
  const { supabase, user } = await requireUser();
  const { data: roles, error: roleError } = await supabase.from("user_roles")
    .select("organization_id")
    .eq("user_id", user.id)
    .in("role", ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER", "DISPATCHER"]);
  if (roleError) throw new Error("Não foi possível validar o acesso ao Field Service.");
  const organizationIds = [...new Set((roles ?? []).map((role) => role.organization_id))];
  if (!organizationIds.length) return <section className="mx-auto max-w-6xl p-6 sm:p-8">
    <OneitPageHeader eyebrow="Operação" title="Agendamento de OS" description="Despacho e acompanhamento dos atendimentos de campo." />
    <div className="mt-6"><OneitEmptyState title="Acesso restrito" description="Seu perfil não possui permissão de despacho nesta organização." /></div>
  </section>;

  const [ticketResult, orderResult, technicianResult, fieldTechnicianResult, locationResult, reviewResult] = await Promise.all([
    supabase.from("tickets").select("id,organization_id,customer_id,location_id,ticket_number,title,priority,operational_status,opened_at")
      .in("organization_id", organizationIds).order("opened_at", { ascending: false }).limit(300),
    supabase.from("service_orders").select("id,organization_id,ticket_id,order_number,status,technician_id,scheduled_at")
      .in("organization_id", organizationIds).neq("status", "CANCELLED").order("created_at", { ascending: false }).limit(300),
    supabase.from("technicians").select("id,organization_id,full_name,phone,mobile,status,base_city,active")
      .in("organization_id", organizationIds).eq("active", true).order("full_name").limit(300),
    // Carrega vínculos inativos também: a resolução deve respeitar uma
    // inativação explícita e recuperar apenas técnicos legados sem vínculo.
    supabase.from("field_service_technicians").select("organization_id,operational_technician_id,phone,mobile,active")
      .in("organization_id", organizationIds).limit(300),
    supabase.from("customer_locations").select("id,organization_id,customer_id,name,street,street_number,complement,district,postal_code,city,state_code,active")
      .in("organization_id", organizationIds).eq("active", true).order("name").limit(500),
    supabase.from("field_service_review_queue").select("id,organization_id,service_order_id,status")
      .in("organization_id", organizationIds).eq("status", "PENDING").limit(300),
  ]);
  if (ticketResult.error || orderResult.error || technicianResult.error || fieldTechnicianResult.error || locationResult.error || reviewResult.error) {
    throw new Error("Não foi possível carregar o agendamento de OS.");
  }
  const locationIds = (locationResult.data ?? []).map((location) => location.id);
  const contactResult = locationIds.length
    ? await supabase.from("location_contacts").select("id,location_id,name,phone,mobile,active").in("location_id", locationIds).eq("active", true).order("name").limit(500)
    : { data: [], error: null };
  if (contactResult.error) throw new Error("Não foi possível carregar os contatos das localidades.");

  const dispatchMappings = withMissingOperationalMappings(fieldTechnicianResult.data ?? [], technicianResult.data ?? []);
  const dispatchTechnicians = resolveDispatchTechnicians(dispatchMappings, technicianResult.data ?? []).map((technician) => {
    const mapping = (fieldTechnicianResult.data ?? []).find((item) => item.organization_id === technician.organization_id && item.operational_technician_id === technician.id);
    return { ...technician, phone: mapping?.mobile || mapping?.phone || technician.mobile || technician.phone || null };
  });
  const unlinkedTechnicians = countUnlinkedActiveTechnicians(fieldTechnicianResult.data ?? []);
  const linkedOperationalIds = new Set(dispatchMappings.filter((item) => item.active && item.operational_technician_id).map((item) => item.operational_technician_id));
  const unavailableTechnicians = (technicianResult.data ?? []).filter((technician) => technician.active && linkedOperationalIds.has(technician.id) && ["UNAVAILABLE", "OFFLINE", "VACATION"].includes(technician.status)).length;

  return <section className="mx-auto max-w-7xl p-5 sm:p-8">
    <OneitPageHeader eyebrow="Operação" title="Agendamento de OS" description="Selecione um chamado, defina o técnico e agende a visita em uma só tela." />
    <DispatchWorkspace tickets={ticketResult.data ?? []} orders={orderResult.data ?? []}
      technicians={dispatchTechnicians} locations={locationResult.data ?? []} locationContacts={contactResult.data ?? []}
      pendingReviews={reviewResult.data ?? []} unlinkedTechnicians={unlinkedTechnicians} unavailableTechnicians={unavailableTechnicians} initialTicketId={initialTicketId} />
  </section>;
}
