import { OneitPageHeader } from "@/components/oneit-page-header";
import { requireUser } from "@/lib/auth/current-user";
import { escalateTicket } from "./actions";

type PageProps = { searchParams: Promise<{ message?: string }> };
const labels: Record<string, string> = { FUNCTIONAL: "Funcional — maior especialização", HIERARCHICAL: "Hierárquico — gestão/criticidade" };

export default async function EscalationsPage({ searchParams }: PageProps) {
  const [{ supabase, user }, { message }] = await Promise.all([requireUser(), searchParams]);
  const { data: roles } = await supabase.from("user_roles").select("organization_id").eq("user_id", user.id).in("role", ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER", "DISPATCHER"]);
  const organizationIds = [...new Set((roles ?? []).map((role) => role.organization_id))];
  if (!organizationIds.length) return <section className="p-8"><h1 className="text-2xl font-semibold">Escalonamentos</h1><p className="mt-3">Seu perfil não possui acesso a escalonamentos.</p></section>;
  const [{ data: tickets }, { data: groups }, { data: escalations }] = await Promise.all([
    supabase.from("tickets").select("id, ticket_number, title, organization_id, support_level, resolver_group_id, operational_status").in("organization_id", organizationIds).order("created_at", { ascending: false }).limit(500),
    supabase.from("support_groups").select("id, organization_id, code, name, support_level").in("organization_id", organizationIds).eq("active", true).order("support_level").order("name"),
    supabase.from("ticket_escalations").select("id, ticket_id, source_group_id, target_group_id, escalation_type, source_level, target_level, reason, created_at").in("organization_id", organizationIds).order("created_at", { ascending: false }).limit(250),
  ]);
  const ticketById = new Map((tickets ?? []).map((ticket) => [ticket.id, ticket]));
  const groupById = new Map((groups ?? []).map((group) => [group.id, group]));
  const activeTickets = (tickets ?? []).filter((ticket) => !["TECHNICALLY_COMPLETED", "OUT_OF_SCOPE", "CANCELLED", "DUPLICATE", "INVALID"].includes(ticket.operational_status));
  return <section className="mx-auto max-w-7xl p-5 sm:p-8">
    <OneitPageHeader eyebrow="ITSM · OPERAÇÃO" title="Escalonamentos N1 / N2 / N3" description="Eleve o nível de atendimento ou registre o acionamento da gestão sem perder o histórico do chamado." />
    {message ? <p role="status" className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">{message}</p> : null}
    <form action={escalateTicket} className="oneit-card mt-6 grid gap-3 p-5 sm:grid-cols-2">
      <h2 className="sm:col-span-2 text-base font-semibold text-slate-900">Novo escalonamento</h2>
      <select aria-label="Chamado" name="ticketId" required defaultValue="" className="rounded-lg border border-slate-300 p-2"><option disabled value="">Chamado</option>{activeTickets.map((ticket) => <option key={ticket.id} value={ticket.id}>{ticket.ticket_number} · N{ticket.support_level} — {ticket.title}</option>)}</select>
      <select aria-label="Grupo de destino" name="targetGroupId" required defaultValue="" className="rounded-lg border border-slate-300 p-2"><option disabled value="">Grupo de destino</option>{(groups ?? []).map((group) => <option key={group.id} value={group.id}>N{group.support_level} · {group.code} — {group.name}</option>)}</select>
      <select aria-label="Tipo" name="escalationType" required defaultValue="" className="rounded-lg border border-slate-300 p-2"><option disabled value="">Tipo</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <textarea aria-label="Motivo do escalonamento" name="reason" required minLength={10} maxLength={2000} placeholder="Motivo do escalonamento" className="min-h-24 rounded-lg border border-slate-300 p-2" />
      <textarea aria-label="Resumo técnico" name="technicalSummary" minLength={10} maxLength={10000} placeholder="Resumo técnico e ações já realizadas (opcional)" className="min-h-24 rounded-lg border border-slate-300 p-2 sm:col-span-2" />
      <button className="w-fit rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 sm:col-span-2">Escalonar chamado</button>
    </form>
    <section className="oneit-card mt-6 overflow-hidden"><h2 className="border-b border-slate-200 p-5 font-semibold">Histórico de escalonamentos</h2><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Chamado</th><th className="p-3">Transição</th><th className="p-3">Tipo</th><th className="p-3">Motivo</th><th className="p-3">Data (UTC)</th></tr></thead><tbody>{(escalations ?? []).map((escalation) => <tr key={escalation.id} className="border-t align-top"><td className="p-3">{ticketById.get(escalation.ticket_id)?.ticket_number ?? escalation.ticket_id.slice(0, 8)}</td><td className="p-3">N{escalation.source_level} {escalation.source_group_id ? `· ${groupById.get(escalation.source_group_id)?.name ?? "—"}` : ""} → N{escalation.target_level} · {groupById.get(escalation.target_group_id)?.name ?? "—"}</td><td className="p-3">{labels[escalation.escalation_type] ?? escalation.escalation_type}</td><td className="p-3 text-slate-600">{escalation.reason}</td><td className="whitespace-nowrap p-3">{new Date(escalation.created_at).toISOString()}</td></tr>)}</tbody></table></div>{!escalations?.length ? <p className="p-5 text-sm text-slate-600">Nenhum escalonamento registrado.</p> : null}</section>
  </section>;
}
