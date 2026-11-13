import Link from "next/link";

import { OneitPageHeader, OneitStatusBadge } from "@/components/oneit";

type Ticket = {
  id: string;
  ticket_number: string;
  servicenow_number: string | null;
  ticket_type: string;
  title: string;
  description: string | null;
  category_code: string | null;
  service_type_code: string | null;
  impact: string;
  urgency: string;
  priority: string;
  operational_status: string;
  administrative_status: string;
  opened_at: string;
  scheduled_at: string | null;
  closed_at: string | null;
  support_level: string;
};

type Level = { response_minutes: number; resolution_minutes: number; ola_minutes: number; response_due_at: string | null; resolution_due_at: string | null; ola_due_at: string | null; response_met_at: string | null; ola_met_at: string | null; paused_seconds: number };
type Communication = { id: string; audience: string; message: string; target_email: string | null; delivery_status: string; created_at: string };
type TimelineItem = { at: string; title: string; detail?: string };

type Props = {
  ticket: Ticket;
  requesterName: string;
  groupLabel: string;
  level: Level | null;
  communications: Communication[];
  timeline: TimelineItem[];
  canDispatch: boolean;
  awaitingValidation: boolean;
  message?: string;
  statusLabel: string;
  onCommunication: (formData: FormData) => void | Promise<void>;
};

export function TicketCaseFileView({ ticket, requesterName, groupLabel, level, communications, timeline, canDispatch, awaitingValidation, message, statusLabel, onCommunication }: Props) {
  return <section className="mx-auto max-w-6xl p-5 sm:p-8">
    <Link href="/portal/tickets" className="text-sm font-medium text-[#0b4a64]">← Voltar aos chamados</Link>
    <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
      <OneitPageHeader eyebrow="Dossiê do chamado" title={`${ticket.ticket_number} — ${ticket.title}`} description={`${ticket.ticket_type} · P${ticket.priority} · impacto ${ticket.impact} · urgência ${ticket.urgency} · N${ticket.support_level}${groupLabel ? ` · ${groupLabel}` : ""}`} />
      {canDispatch ? <div className="flex flex-wrap gap-2"><Link href={`/portal/tickets/${ticket.id}/edit`} className="shrink-0 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-sky-900 hover:bg-sky-50">Editar chamado</Link><Link href={`/portal/field-service?ticket=${encodeURIComponent(ticket.id)}`} className="shrink-0 rounded-lg bg-[#092f40] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0b4a64]">Atribuir visita</Link></div> : awaitingValidation ? <Link href="/portal/review" className="shrink-0 rounded-lg bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-800">Validar OS</Link> : null}
    </div>
    {message ? <p role="status" className="mt-4 rounded-lg bg-sky-50 p-3 text-sm text-sky-900">{message}</p> : null}

    <nav aria-label="Seções do chamado" className="mt-6 flex gap-2 border-b border-slate-300 pb-3 text-sm">
      <a href="#principal" className="rounded-lg bg-slate-900 px-3 py-2 font-semibold text-white">Principal</a>
      <a href="#comunicacoes" className="rounded-lg border border-slate-300 px-3 py-2 font-medium text-slate-700">Comunicações</a>
      <a href="#historico" className="rounded-lg border border-slate-300 px-3 py-2 font-medium text-slate-700">Histórico</a>
    </nav>

    <section id="principal" className="mt-5 scroll-mt-5 space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-sm font-semibold text-slate-900">Descrição da solicitação</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{ticket.description || "Sem descrição informada."}</p></div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">Resumo</h2><dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 text-sm"><Data label="Serviço" value={ticket.category_code && ticket.service_type_code ? `${ticket.category_code} / ${ticket.service_type_code}` : "Não classificado"} /><Data label="Solicitante" value={requesterName} /><Data label="Situação" value={<OneitStatusBadge tone={ticket.operational_status === "CANCELLED" ? "danger" : awaitingValidation ? "warning" : "info"}>{statusLabel}</OneitStatusBadge>} /><Data label="Administrativo" value={ticket.administrative_status} /><Data label="Abertura" value={formatDate(ticket.opened_at)} />{ticket.scheduled_at ? <Data label="Agendamento" value={formatDate(ticket.scheduled_at)} /> : null}{ticket.closed_at ? <Data label="Fechamento" value={formatDate(ticket.closed_at)} /> : null}</dl>{awaitingValidation ? <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Atendimento técnico encerrado. Aguardando validação do gestor.</p> : null}</section>
        <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">SLA / OLA</h2>{level ? <div className="mt-4 space-y-2 text-sm text-slate-700"><p>Resposta: {level.response_met_at ? `atingida em ${formatDate(level.response_met_at)}` : `prazo ${formatDate(level.response_due_at)}`}</p><p>Resolução: prazo {formatDate(level.resolution_due_at)}</p><p>OLA: {level.ola_met_at ? `atingida em ${formatDate(level.ola_met_at)}` : `prazo ${formatDate(level.ola_due_at)}`}</p><p className="text-slate-500">Pausas acumuladas: {level.paused_seconds} s</p></div> : <p className="mt-4 text-sm text-slate-600">Não há política de SLA/OLA para este chamado.</p>}</section>
      </div>
    </section>

    <section id="comunicacoes" className="mt-6 scroll-mt-5 rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">Comunicações</h2><p className="mt-1 text-sm text-slate-500">Registre atualizações ao solicitante ou notas internas.</p><form action={onCommunication} className="mt-4 space-y-3"><input type="hidden" name="ticketId" value={ticket.id} /><select name="audience" defaultValue="CUSTOMER" className="w-full rounded-lg border border-slate-300 p-2.5"><option value="CUSTOMER">Comunicação com solicitante (e-mail)</option><option value="INTERNAL">Comunicação interna</option></select><textarea name="message" required minLength={3} maxLength={12000} placeholder="Escreva a atualização" className="min-h-24 w-full rounded-lg border border-slate-300 p-2.5" /><button className="rounded-lg border border-[#0b4a64] px-4 py-2.5 text-sm font-semibold text-[#0b4a64]">Registrar comunicação</button></form><ul className="mt-5 space-y-2">{communications.map((item) => <li key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"><p className="font-semibold">{item.audience === "CUSTOMER" ? "Solicitante" : "Interna"} · {item.delivery_status}</p><p className="mt-1 whitespace-pre-wrap text-slate-700">{item.message}</p><p className="mt-1 text-xs text-slate-500">{formatDate(item.created_at)}{item.target_email ? ` · ${item.target_email}` : ""}</p></li>)}{communications.length === 0 ? <li className="text-sm text-slate-500">Nenhuma comunicação registrada.</li> : null}</ul></section>

    <section id="historico" className="mt-6 scroll-mt-5 rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">Histórico</h2><p className="mt-1 text-sm text-slate-500">Linha do tempo do chamado, sem blocos administrativos redundantes.</p>{timeline.length ? <ol className="mt-5 space-y-4 border-l-2 border-slate-200 pl-5">{timeline.map((item, index) => <li key={`${item.at}-${index}`} className="relative text-sm before:absolute before:-left-[1.85rem] before:top-1 before:h-3 before:w-3 before:rounded-full before:bg-cyan-700"><p className="font-medium text-slate-900">{item.title}</p><p className="text-slate-500">{formatDate(item.at)}</p>{item.detail ? <p className="mt-1 whitespace-pre-wrap text-slate-600">{item.detail}</p> : null}</li>)}</ol> : <p className="mt-4 text-sm text-slate-600">Nenhum evento visível para este chamado.</p>}</section>
  </section>;
}

function Data({ label, value }: { label: string; value: React.ReactNode }) { return <div><dt className="text-slate-500">{label}</dt><dd className="mt-0.5 text-slate-900">{value}</dd></div>; }
function formatDate(value: string | null) { return value ? new Date(value).toLocaleString("pt-BR") : "Não informado"; }
