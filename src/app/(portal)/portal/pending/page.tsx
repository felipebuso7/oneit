import { requireUser } from "@/lib/auth/current-user";
import { pendingLabels } from "@/domain/tickets/pending";
import { PendingForm } from "@/components/field/pending-form";
import { resumeTicket, rescheduleTicket } from "./actions";

type PageProps = { searchParams: Promise<{ message?: string }> };
export default async function PendingPage({ searchParams }: PageProps) {
  const [{ supabase, user }, { message }] = await Promise.all([requireUser(), searchParams]);
  const { data: roles, error: roleError } = await supabase.from("user_roles").select("organization_id").eq("user_id", user.id).in("role", ["MANAGER", "DISPATCHER", "ORG_ADMIN", "SUPER_ADMIN"]);
  if (roleError) throw new Error("Não foi possível verificar permissões de gestão.");
  const managementIds = new Set((roles ?? []).map((role) => role.organization_id));
  const { data: tickets, error } = await supabase.from("tickets").select("id, organization_id, ticket_number, title, version, operational_status")
    .in("operational_status", ["TRIAGE", "AWAITING_SCHEDULING", "SCHEDULED", "ASSIGNED", "TRAVEL_STARTED", "ON_SITE", "WORK_STARTED", "IN_PROGRESS", ...Object.keys(pendingLabels)])
    .order("updated_at", { ascending: false }).limit(50);
  if (error) throw new Error("Não foi possível carregar pendências e agendamentos.");
  const ids = (tickets ?? []).map((ticket) => ticket.id);
  const [{ data: periods, error: periodError }, { data: technicians, error: technicianError }, { data: changes, error: changeError }] = await Promise.all([
    ids.length ? supabase.from("ticket_pending_periods").select("id, ticket_id, previous_status, pending_status, reason, started_at, resolved_at, resolution_reason").in("ticket_id", ids).order("started_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
    managementIds.size ? supabase.from("technicians").select("id, organization_id, full_name").in("organization_id", Array.from(managementIds)).eq("active", true).order("full_name") : Promise.resolve({ data: [], error: null }),
    ids.length ? supabase.from("ticket_schedule_changes").select("id, ticket_id, reason, created_at").in("ticket_id", ids).order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
  ]);
  if (periodError || technicianError || changeError) throw new Error("Não foi possível carregar o histórico operacional.");
  return <section className="mx-auto max-w-4xl p-8"><p className="text-sm font-semibold tracking-[0.15em] text-cyan-700">OPERAÇÃO</p><h1 className="mt-2 text-3xl font-semibold">Pendências e reagendamento</h1>
    {message ? <p role="status" className="mt-4 rounded bg-sky-100 p-3 text-sm">{message}</p> : null}
    {!tickets?.length ? <p className="mt-6">Nenhuma OS disponível.</p> : null}
    <div className="mt-6 space-y-4">{(tickets ?? []).map((ticket) => {
      const history = (periods ?? []).filter((period) => period.ticket_id === ticket.id);
      const open = history.find((period) => !period.resolved_at);
      const canManage = managementIds.has(ticket.organization_id);
      const canReschedule = canManage && ["SCHEDULED", "ASSIGNED", "TRAVEL_STARTED", "ON_SITE"].includes(ticket.operational_status);
      return <article className="rounded-xl border bg-white p-5" key={ticket.id}>
        <h2 className="font-semibold">{ticket.ticket_number} — {ticket.title}</h2><p className="mt-2 text-sm">Etapa: {ticket.operational_status}</p>
        {open ? <div className="mt-3 rounded bg-amber-50 p-3 text-sm"><p className="font-medium">{pendingLabels[open.pending_status as keyof typeof pendingLabels]}</p><p>{open.reason}</p><p className="mt-1 text-slate-600">Retomada prevista: {open.previous_status}</p>
          {canManage ? <form action={resumeTicket} className="mt-3 space-y-2"><input type="hidden" name="ticketId" value={ticket.id} /><input type="hidden" name="version" value={ticket.version} /><label className="block">Como a pendência foi resolvida?<textarea required minLength={10} maxLength={2000} name="reason" className="mt-1 block w-full rounded border p-2" /></label><button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">Resolver e retomar</button></form> : <p className="mt-2">Aguardando liberação pela gestão.</p>}
        </div> : <PendingForm ticketId={ticket.id} version={ticket.version} status={ticket.operational_status} />}
        {canReschedule ? <details className="mt-4 rounded border p-3"><summary className="cursor-pointer font-medium">Reagendar OS</summary><form action={rescheduleTicket} className="mt-3 space-y-3">
          <input type="hidden" name="ticketId" value={ticket.id} /><input type="hidden" name="version" value={ticket.version} />
          <label className="block text-sm">Técnico<select name="technicianId" required defaultValue="" className="mt-1 block w-full rounded border p-2"><option value="" disabled>Selecione</option>{(technicians ?? []).filter((technician) => technician.organization_id === ticket.organization_id).map((technician) => <option key={technician.id} value={technician.id}>{technician.full_name}</option>)}</select></label>
          <label className="block text-sm">Novo início, com fuso<input name="start" required placeholder="2026-10-02T08:00:00-03:00" className="mt-1 block w-full rounded border p-2" /></label>
          <label className="block text-sm">Novo fim, com fuso<input name="end" required placeholder="2026-10-02T10:00:00-03:00" className="mt-1 block w-full rounded border p-2" /></label>
          <label className="block text-sm">Motivo<textarea name="reason" required minLength={10} maxLength={2000} className="mt-1 block w-full rounded border p-2" /></label>
          <p className="text-sm text-slate-600">A agenda anterior será preservada. Confirme a nova atribuição na tela Agenda.</p>
          <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">Reagendar</button>
        </form></details> : null}
        {history.length || (changes ?? []).some((change) => change.ticket_id === ticket.id) ? <details className="mt-4 text-sm"><summary className="cursor-pointer">Histórico operacional</summary><ul className="mt-2 space-y-2">{history.map((period) => <li key={period.id}>{period.pending_status}: {period.reason}{period.resolved_at ? ` — Resolvida: ${period.resolution_reason}` : " — Em aberto"}</li>)}{(changes ?? []).filter((change) => change.ticket_id === ticket.id).map((change) => <li key={change.id}>Reagendamento: {change.reason}</li>)}</ul></details> : null}
      </article>;
    })}</div>
  </section>;
}
