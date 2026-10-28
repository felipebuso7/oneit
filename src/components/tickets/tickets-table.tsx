"use client";

import { useMemo, useState } from "react";

import { OneitStatusBadge } from "@/components/oneit-status-badge";

type Ticket = { id: string; ticket_number: string; servicenow_number: string | null; customer_name: string; location_name: string; title: string; ticket_type: string; priority: number; operational_status: string; created_at: string; category_code: string | null; service_type_code: string | null; resolution_due_at: string | null };
type SortKey = "ticket_number" | "created_at" | "title" | "priority" | "operational_status" | "resolution_due_at";

const pendingStatuses = new Set(["PENDING_CUSTOMER", "PENDING_ACCESS", "PENDING_MATERIAL", "PENDING_THIRD_PARTY", "PENDING_CLIENT_IT", "WAITING_AUTHORIZATION"]);
const closedStatuses = new Set(["OUT_OF_SCOPE", "CANCELLED", "DUPLICATE", "INVALID"]);
const operationalStatusLabel: Record<string, string> = { NEW: "Novo", TRIAGE: "Em triagem", AWAITING_SCHEDULING: "Aguardando despacho", SCHEDULED: "Agendado", ASSIGNED: "Atribuído", TRAVEL_STARTED: "Em deslocamento", ON_SITE: "No local", WORK_STARTED: "Atendimento iniciado", IN_PROGRESS: "Em atendimento", TECHNICALLY_COMPLETED: "Concluído tecnicamente", PENDING_CUSTOMER: "Aguardando cliente", PENDING_ACCESS: "Aguardando acesso", PENDING_MATERIAL: "Aguardando material", PENDING_THIRD_PARTY: "Aguardando terceiro", PENDING_CLIENT_IT: "Aguardando TI do cliente", RESCHEDULED: "Reagendado", WAITING_AUTHORIZATION: "Aguardando autorização", OUT_OF_SCOPE: "Fora de escopo", CANCELLED: "Cancelado", DUPLICATE: "Duplicado", INVALID: "Inválido" };

function statusFor(ticket: Ticket) {
  if (!closedStatuses.has(ticket.operational_status) && ticket.resolution_due_at && Date.parse(ticket.resolution_due_at) < Date.now()) return { label: "SLA estourado", tone: "danger" as const };
  if (ticket.operational_status === "TECHNICALLY_COMPLETED") return { label: "Aguardando validação", tone: "warning" as const };
  if (pendingStatuses.has(ticket.operational_status)) return { label: "Pendente", tone: "warning" as const };
  if (closedStatuses.has(ticket.operational_status)) return { label: "Encerrado", tone: "neutral" as const };
  return { label: "Aberto", tone: "success" as const };
}

function remainingSla(dueAt: string | null) {
  if (!dueAt) return "Sem SLA";
  const minutes = Math.round((Date.parse(dueAt) - Date.now()) / 60_000);
  if (minutes < 0) return `Estourado há ${Math.abs(minutes)} min`;
  if (minutes < 60) return `Vence em ${minutes} min`;
  return `Vence em ${Math.floor(minutes / 60)}h ${minutes % 60}min`;
}

export function TicketsTable({ tickets }: { tickets: Ticket[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [ascending, setAscending] = useState(false);
  const sorted = useMemo(() => [...tickets].sort((left, right) => {
    const a = left[sortKey] ?? ""; const b = right[sortKey] ?? "";
    const comparison = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), "pt-BR", { numeric: true });
    return ascending ? comparison : -comparison;
  }), [tickets, sortKey, ascending]);
  const header = (label: string, key: SortKey) => <button type="button" aria-label={`Ordenar por ${label}${sortKey === key ? ascending ? ", crescente" : ", decrescente" : ""}`} onClick={() => { if (sortKey === key) setAscending((value) => !value); else { setSortKey(key); setAscending(key === "ticket_number" || key === "title"); } }} className="font-semibold hover:text-slate-950">{label}{sortKey === key ? ascending ? " ↑" : " ↓" : ""}</button>;

  return <section className="oneit-card mt-6 min-w-0 overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--oneit-line)] p-4"><div><h2 className="font-semibold">Fila de chamados</h2><p className="mt-1 text-sm text-slate-500">Clique no nome da coluna para ordenar crescente ou decrescente.</p></div><select aria-label="Ordenar chamados" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)} className="rounded-lg border border-slate-300 p-2 text-sm"><option value="created_at">Data de abertura</option><option value="ticket_number">Número do chamado</option><option value="title">Título</option><option value="priority">Prioridade</option><option value="operational_status">Operação</option><option value="resolution_due_at">Vencimento SLA</option></select></div><div className="overflow-x-auto"><table className="oneit-data-table min-w-[1240px] table-fixed text-left text-sm"><colgroup><col className="w-[155px]" /><col className="w-[135px]" /><col className="w-[185px]" /><col className="w-[245px]" /><col className="w-[180px]" /><col className="w-[90px]" /><col className="w-[175px]" /><col className="w-[145px]" /><col className="w-[130px]" /></colgroup><thead><tr><th>{header("Situação", "operational_status")}</th><th>{header("OS", "ticket_number")}</th><th>Cliente / local</th><th>{header("Título", "title")}</th><th>Serviço</th><th>{header("Prioridade", "priority")}</th><th>{header("Abertura", "created_at")}</th><th>{header("SLA", "resolution_due_at")}</th><th>Ação</th></tr></thead><tbody>{sorted.map((ticket) => { const status = statusFor(ticket); const canDispatch = ["NEW", "TRIAGE", "AWAITING_SCHEDULING", "SCHEDULED", "ASSIGNED"].includes(ticket.operational_status); return <tr key={ticket.id}><td className="align-top leading-5"><OneitStatusBadge tone={status.tone}>{status.label}</OneitStatusBadge><p className="mt-1 text-xs text-slate-500">{operationalStatusLabel[ticket.operational_status] ?? ticket.operational_status}</p></td><td className="align-top font-medium leading-5"><a className="break-words text-cyan-700 underline" href={`/portal/tickets/${ticket.id}`}>{ticket.ticket_number}</a>{ticket.servicenow_number ? <small className="block break-words text-xs font-normal text-slate-500">SN: {ticket.servicenow_number}</small> : null}</td><td className="align-top leading-5"><span className="block truncate" title={ticket.customer_name}>{ticket.customer_name}</span><small className="block truncate text-slate-500" title={ticket.location_name}>{ticket.location_name}</small></td><td className="align-top break-words leading-5">{ticket.title}</td><td className="align-top break-words leading-5">{ticket.category_code && ticket.service_type_code ? `${ticket.category_code} / ${ticket.service_type_code}` : "Não classificado"}</td><td className="align-top whitespace-nowrap leading-5">P{ticket.priority}</td><td className="align-top whitespace-nowrap leading-5">{new Date(ticket.created_at).toLocaleString("pt-BR")}</td><td className="align-top whitespace-nowrap leading-5"><span className={status.label === "SLA estourado" ? "font-semibold text-rose-700" : ""}>{remainingSla(ticket.resolution_due_at)}</span></td><td className="align-top whitespace-nowrap leading-5">{canDispatch ? <a className="font-semibold text-cyan-700 hover:underline" href={`/portal/field-service?ticket=${encodeURIComponent(ticket.id)}`}>Atribuir visita</a> : ticket.operational_status === "TECHNICALLY_COMPLETED" ? <a className="font-semibold text-emerald-700 hover:underline" href="/portal/review">Validar OS</a> : "—"}</td></tr>; })}{!sorted.length ? <tr><td colSpan={9} className="p-5 text-center text-slate-500">Nenhum chamado visível para suas organizações.</td></tr> : null}</tbody></table></div></section>;
}
