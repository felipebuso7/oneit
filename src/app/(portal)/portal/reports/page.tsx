import { requireUser } from "@/lib/auth/current-user";
import { generateReport } from "./actions";
import { OneitEmptyState, OneitPageHeader } from "@/components/oneit";

type PageProps = { searchParams: Promise<{ message?: string }> };
export default async function ReportsPage({ searchParams }: PageProps) {
  const [{ supabase, user }, { message }] = await Promise.all([requireUser(), searchParams]);
  const { data: roles, error: roleError } = await supabase.from("user_roles").select("organization_id").eq("user_id", user.id).in("role", ["MANAGER", "ORG_ADMIN", "SUPER_ADMIN"]);
  if (roleError) throw new Error("Não foi possível validar acesso aos relatórios.");
  if (!roles?.length) return <section className="p-8"><OneitPageHeader eyebrow="Documentação" title="Relatórios de atendimento" description="Seu perfil não possui acesso à geração de relatórios." /></section>;
  const { data: tickets, error } = await supabase.from("tickets").select("id, ticket_number, title, administrative_status").in("organization_id", roles.map((role) => role.organization_id)).in("administrative_status", ["APPROVED", "REPORT_GENERATED", "CLOSED"]).order("updated_at", { ascending: false }).limit(50);
  if (error) throw new Error("Não foi possível carregar as OS aprovadas.");
  const ids = (tickets ?? []).map((ticket) => ticket.id);
  const { data: reports, error: reportError } = ids.length ? await supabase.from("ticket_reports").select("id, ticket_id, report_version, created_at").in("ticket_id", ids).order("report_version", { ascending: false }) : { data: [], error: null };
  if (reportError) throw new Error("Não foi possível carregar as versões de relatório.");
  return <section className="mx-auto max-w-5xl p-6 sm:p-8"><OneitPageHeader eyebrow="Documentação" title="Relatórios de atendimento" description="Gere e consulte as versões de RTO associadas às OS aprovadas." />
    {message ? <p role="status" className="mt-4 rounded bg-sky-100 p-3 text-sm">{message}</p> : null}
    {!tickets?.length ? <div className="mt-6"><OneitEmptyState title="Nenhuma OS aprovada" description="As OS aprovadas aparecerão aqui para geração do relatório técnico." /></div> : null}
    <div className="mt-6 space-y-4">{(tickets ?? []).map((ticket) => <article className="rounded-xl border bg-white p-5" key={ticket.id}>
      <h2 className="font-semibold">{ticket.ticket_number} — {ticket.title}</h2>
      {ticket.administrative_status !== "CLOSED" ? <form action={generateReport} className="mt-3"><input type="hidden" name="ticketId" value={ticket.id} /><button type="submit" className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Gerar nova versão PDF</button></form> : <p className="mt-3 text-sm text-slate-600">OS encerrada. Versões preservadas para consulta.</p>}
      {(reports ?? []).filter((report) => report.ticket_id === ticket.id).length ? <ul className="mt-3 space-y-2 text-sm">{(reports ?? []).filter((report) => report.ticket_id === ticket.id).map((report) => <li key={report.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2"><span>Versão {report.report_version} · {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(report.created_at))}</span><a href={`/portal/reports/${report.id}`} target="_blank" rel="noreferrer" aria-label={`Visualizar ou baixar RTO versão ${report.report_version}`} className="font-semibold text-cyan-700 underline">Visualizar / baixar PDF</a></li>)}</ul> : <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">Nenhuma versão gerada ainda. Gere o RTO após a aprovação da OS.</p>}
    </article>)}</div>
  </section>;
}
