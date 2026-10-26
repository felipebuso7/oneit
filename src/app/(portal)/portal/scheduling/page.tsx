import { requireUser } from "@/lib/auth/current-user";
import { listAvailableOrganizations } from "@/lib/organizations/queries";
import { assignTicket, scheduleTicket } from "./actions";
import { OneitButton, OneitEmptyState, OneitPageHeader, OneitSection, OneitStatusBadge } from "@/components/oneit";

type PageProps = { searchParams: Promise<{ message?: string }> };

export default async function SchedulingPage({ searchParams }: PageProps) {
  const [{ supabase }, organizations, { message }] = await Promise.all([requireUser(), listAvailableOrganizations(), searchParams]);
  const organizationIds = organizations.map((organization) => organization.id);
  const [{ data: tickets }, { data: technicians }, { data: schedules }] = await Promise.all([
    organizationIds.length ? supabase.from("tickets").select("id, ticket_number, title, operational_status").in("organization_id", organizationIds).in("operational_status", ["AWAITING_SCHEDULING", "SCHEDULED"]).order("created_at").limit(500) : Promise.resolve({ data: [] }),
    organizationIds.length ? supabase.from("technicians").select("id, full_name, organization_id, status").in("organization_id", organizationIds).eq("active", true).order("full_name") : Promise.resolve({ data: [] }),
    organizationIds.length ? supabase.from("ticket_schedules").select("ticket_id, technician_id, planned_start, planned_end").eq("status", "SCHEDULED") : Promise.resolve({ data: [] }),
  ]);
  const technicianById = new Map((technicians ?? []).map((technician) => [technician.id, technician]));
  const scheduleByTicket = new Map((schedules ?? []).map((schedule) => [schedule.ticket_id, schedule]));
  const awaiting = (tickets ?? []).filter((ticket) => ticket.operational_status === "AWAITING_SCHEDULING");
  const scheduled = (tickets ?? []).filter((ticket) => ticket.operational_status === "SCHEDULED");

  return <section className="mx-auto max-w-6xl p-6 sm:p-8"><OneitPageHeader eyebrow="Despacho" title="Agenda e atribuição" description="Horários são gravados em UTC. A configuração de fuso por contrato será incluída antes do piloto." />{message ? <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">{message}</p> : null}
    <OneitSection className="mt-7" title="Aguardando agendamento" description="Selecione o técnico e informe a janela planejada.">{awaiting.length ? <div className="space-y-3">{awaiting.map((ticket) => <form action={scheduleTicket} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-5" key={ticket.id}><div className="md:col-span-2"><strong>{ticket.ticket_number}</strong><p className="text-sm text-slate-600">{ticket.title}</p></div><input name="ticketId" type="hidden" value={ticket.id} /><select className="rounded-lg border border-slate-300 p-2" name="technicianId" required defaultValue=""><option disabled value="">Técnico</option>{(technicians ?? []).map((tech) => <option key={tech.id} value={tech.id}>{tech.full_name} · {tech.status}</option>)}</select><input className="rounded-lg border border-slate-300 p-2" name="plannedStart" type="datetime-local" required /><input className="rounded-lg border border-slate-300 p-2" name="plannedEnd" type="datetime-local" required /><OneitButton type="submit">Agendar</OneitButton></form>)}</div> : <OneitEmptyState title="Nenhum chamado aguardando agenda" description="Chamados encaminhados para agendamento aparecerão nesta fila." />}</OneitSection>
    <OneitSection className="mt-6" title="Prontos para atribuição" description="Agendamentos que aguardam a confirmação do técnico responsável.">{scheduled.length ? <div className="space-y-3">{scheduled.map((ticket) => { const schedule = scheduleByTicket.get(ticket.id); const technician = schedule ? technicianById.get(schedule.technician_id) : undefined; return <article className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4" key={ticket.id}><div className="mr-auto"><strong>{ticket.ticket_number}</strong><p className="text-sm text-slate-600">{ticket.title} · {technician?.full_name ?? "Agenda não encontrada"}</p></div><OneitStatusBadge tone="info">Agendado</OneitStatusBadge>{schedule ? <form action={assignTicket}><input name="ticketId" type="hidden" value={ticket.id} /><input name="technicianId" type="hidden" value={schedule.technician_id} /><OneitButton type="submit" variant="secondary">Atribuir técnico</OneitButton></form> : null}</article>; })}</div> : <OneitEmptyState title="Nenhum agendamento pronto" description="Após definir a janela e o técnico, o item aparecerá aqui." />}</OneitSection>
  </section>;
}
