import { requireUser } from "@/lib/auth/current-user";
import { OneitEmptyState, OneitPageHeader } from "@/components/oneit";
import { resolveDispatchTechnicians } from "@/lib/field-service/technician-eligibility";
import { DispatchWorkspace } from "./dispatch-workspace";

export default async function FieldServicePage() {
  const { supabase, user } = await requireUser();
  const { data: roles, error: roleError } = await supabase.from("user_roles")
    .select("organization_id")
    .eq("user_id", user.id)
    .in("role", ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER", "DISPATCHER"]);
  if (roleError) throw new Error("Não foi possível validar o acesso ao Field Service.");
  const organizationIds = [...new Set((roles ?? []).map((role) => role.organization_id))];
  if (!organizationIds.length) return <section className="mx-auto max-w-6xl p-6 sm:p-8">
    <OneitPageHeader eyebrow="Operação" title="Central Field Service" description="Despacho e acompanhamento dos atendimentos de campo." />
    <div className="mt-6"><OneitEmptyState title="Acesso restrito" description="Seu perfil não possui permissão de despacho nesta organização." /></div>
  </section>;

  const [ticketResult, orderResult, technicianResult, fieldTechnicianResult, locationResult, reviewResult] = await Promise.all([
    supabase.from("tickets").select("id,organization_id,customer_id,location_id,ticket_number,title,priority,operational_status,opened_at")
      .in("organization_id", organizationIds).order("opened_at", { ascending: false }).limit(300),
    supabase.from("service_orders").select("id,organization_id,ticket_id,order_number,status,technician_id,scheduled_at")
      .in("organization_id", organizationIds).order("created_at", { ascending: false }).limit(300),
    supabase.from("technicians").select("id,organization_id,full_name,status,base_city,active")
      .in("organization_id", organizationIds).eq("active", true).order("full_name").limit(300),
    supabase.from("field_service_technicians").select("organization_id,operational_technician_id,active")
      .in("organization_id", organizationIds).eq("active", true).limit(300),
    supabase.from("customer_locations").select("id,organization_id,customer_id,name,street,street_number,city,state_code,active")
      .in("organization_id", organizationIds).eq("active", true).order("name").limit(500),
    supabase.from("field_service_review_queue").select("id,organization_id,service_order_id,status")
      .in("organization_id", organizationIds).eq("status", "PENDING").limit(300),
  ]);
  if (ticketResult.error || orderResult.error || technicianResult.error || fieldTechnicianResult.error || locationResult.error || reviewResult.error) {
    throw new Error("Não foi possível carregar a central de Field Service.");
  }

  const dispatchTechnicians = resolveDispatchTechnicians(fieldTechnicianResult.data ?? [], technicianResult.data ?? []);

  return <section className="mx-auto max-w-7xl p-5 sm:p-8">
    <OneitPageHeader eyebrow="Operação" title="Central Field Service" description="Selecione um chamado, confira o técnico e confirme o despacho em uma só tela." />
    <DispatchWorkspace tickets={ticketResult.data ?? []} orders={orderResult.data ?? []}
      technicians={dispatchTechnicians} locations={locationResult.data ?? []}
      pendingReviews={reviewResult.data ?? []} />
  </section>;
}
