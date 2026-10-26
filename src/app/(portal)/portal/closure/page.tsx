import { requireUser } from "@/lib/auth/current-user";
import { closeTicket } from "./actions";

type PageProps = { searchParams: Promise<{ message?: string }> };
export default async function ClosurePage({ searchParams }: PageProps) {
  const [{ supabase, user }, { message }] = await Promise.all([requireUser(), searchParams]);
  const { data: roles, error: roleError } = await supabase.from("user_roles").select("organization_id").eq("user_id", user.id).in("role", ["MANAGER", "ORG_ADMIN", "SUPER_ADMIN"]);
  if (roleError) throw new Error("Não foi possível verificar acesso ao fechamento.");
  if (!roles?.length) return <section className="p-8">Seu perfil não possui permissão para fechamento administrativo.</section>;
  const { data: tickets, error } = await supabase.from("tickets").select("id, ticket_number, title, version, administrative_status, closed_at").in("organization_id", roles.map((role) => role.organization_id)).in("administrative_status", ["REPORT_GENERATED", "CLOSED"]).order("updated_at", { ascending: false }).limit(50);
  if (error) throw new Error("Não foi possível carregar a fila de fechamento.");
  const ids = (tickets ?? []).map((ticket) => ticket.id);
  const [{ data: reports, error: reportError }, { data: closures, error: closureError }] = await Promise.all([
    ids.length ? supabase.from("ticket_reports").select("id, ticket_id, report_version").in("ticket_id", ids).order("report_version", { ascending: false }) : Promise.resolve({ data: [], error: null }),
    ids.length ? supabase.from("ticket_closures").select("ticket_id, report_id, closure_reason, sync_exception_reason").in("ticket_id", ids) : Promise.resolve({ data: [], error: null }),
  ]);
  if (reportError || closureError) throw new Error("Não foi possível carregar os registros de fechamento.");
  return <section className="mx-auto max-w-4xl p-8"><p className="text-sm font-semibold tracking-[0.15em] text-cyan-700">CONTROLE</p><h1 className="mt-2 text-3xl font-semibold">Fechamento administrativo</h1>
    <p className="mt-3 text-sm text-slate-600">As integrações ainda não estão habilitadas. O encerramento nesta etapa exige uma exceção formal e não altera o chamado no Milldesk ou ServiceNow.</p>
    {message ? <p role="status" className="mt-4 rounded bg-sky-100 p-3 text-sm">{message}</p> : null}
    {!tickets?.length ? <p className="mt-6">Nenhuma OS disponível para fechamento.</p> : null}
    <div className="mt-6 space-y-5">{(tickets ?? []).map((ticket) => {
      const closure = (closures ?? []).find((item) => item.ticket_id === ticket.id);
      const report = (reports ?? []).find((item) => item.ticket_id === ticket.id);
      return <article key={ticket.id} className="rounded-xl border bg-white p-5"><h2 className="font-semibold">{ticket.ticket_number} — {ticket.title}</h2>
        {ticket.administrative_status === "CLOSED" ? <div className="mt-3 space-y-2 text-sm"><p>Encerrada em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(ticket.closed_at))}</p><p>Motivo: {closure?.closure_reason}</p><p>Exceção de sincronização: {closure?.sync_exception_reason}</p>{closure ? <a href={`/portal/reports/${closure.report_id}`} target="_blank" rel="noreferrer" className="text-cyan-700 underline">Abrir PDF do fechamento</a> : null}</div> : report ? <form action={closeTicket} className="mt-4 space-y-3">
          <input name="ticketId" type="hidden" value={ticket.id} /><input name="reportId" type="hidden" value={report.id} /><input name="version" type="hidden" value={ticket.version} />
          <a href={`/portal/reports/${report.id}`} target="_blank" rel="noreferrer" className="text-sm text-cyan-700 underline">Conferir PDF versão {report.report_version}</a>
          <label className="block text-sm">Motivo do encerramento<textarea name="closureReason" required minLength={10} maxLength={2000} className="mt-1 block w-full rounded border p-2" /></label>
          <label className="block text-sm">Justificativa para fechamento sem sincronização<textarea name="exceptionReason" required minLength={10} maxLength={2000} className="mt-1 block w-full rounded border p-2" /></label>
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="exceptionAcknowledged" required className="mt-1 size-5" />Reconheço que este encerramento se limita ao FSM e que o registro externo continua sem sincronização.</label>
          <button type="submit" className="rounded bg-slate-900 px-4 py-3 font-semibold text-white">Encerrar com exceção registrada</button>
        </form> : <p className="mt-3 text-sm">Relatório não encontrado. O fechamento está indisponível.</p>}
      </article>;
    })}</div>
  </section>;
}
