"use client";

import { useMemo, useState } from "react";

import { awaitScheduling, sendToTriage } from "@/app/(portal)/portal/tickets/actions";
import { OneitStatusBadge } from "@/components/oneit-status-badge";

type Ticket = { id: string; ticket_number: string; title: string; ticket_type: string; priority: number; operational_status: string; created_at: string; category_code: string | null; service_type_code: string | null; resolution_due_at: string | null };
type SortKey = "ticket_number" | "created_at" | "title" | "priority" | "operational_status" | "resolution_due_at";

const pendingStatuses = new Set(["PENDING_CUSTOMER", "PENDING_ACCESS", "PENDING_MATERIAL", "PENDING_THIRD_PARTY", "PENDING_CLIENT_IT", "WAITING_AUTHORIZATION"]);
const closedStatuses = new Set(["TECHNICALLY_COMPLETED", "OUT_OF_SCOPE", "CANCELLED", "DUPLICATE", "INVALID"]);

function statusFor(ticket: Ticket) {
  if (!closedStatuses.has(ticket.operational_status) && ticket.resolution_due_at && Date.parse(ticket.resolution_due_at) < Date.now()) return { label: "SLA estourado", tone: "danger" as const };
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

  return <section className="oneit-card mt-6 overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--oneit-line)] p-4"><div><h2 className="font-semibold">Fila de chamados</h2><p className="mt-1 text-sm text-slate-500">Clique no nome da coluna para ordenar crescente ou decrescente.</p></div><select aria-label="Ordenar chamados" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)} className="rounded-lg border border-slate-300 p-2 text-sm"><option value="created_at">Data de abertura</option><option value="ticket_number">Número do chamado</option><option value="title">Título</option><option value="priority">Prioridade</option><option value="operational_status">Operação</option><option value="resolution_due_at">Vencimento SLA</option></select></div><div className="overflow-x-auto"><table className="oneit-data-table min-w-full text-left text-sm"><thead><tr><th>{header("Situação", "operational_status")}</th><th>{header("OS", "ticket_number")}</th><th>{header("Título", "title")}</th><th>Serviço</th><th>{header("Prioridade", "priority")}</th><th>{header("Abertura", "created_at")}</th><th>{header("SLA", "resolution_due_at")}</th><th>Ação</th></tr></thead><tbody>{sorted.map((ticket) => { const status = statusFor(ticket); return <tr key={ticket.id}><td><OneitStatusBadge tone={status.tone}>{status.label}</OneitStatusBadge><p className="mt-1 text-xs text-slate-500">{ticket.operational_status}</p></td><td className="font-medium"><a className="text-cyan-700 underline" href={`/portal/tickets/${ticket.id}`}>{ticket.ticket_number}</a></td><td>{ticket.title}</td><td>{ticket.category_code && ticket.service_type_code ? `${ticket.category_code} / ${ticket.service_type_code}` : "Não classificado"}</td><td>P{ticket.priority}</td><td className="whitespace-nowrap">{new Date(ticket.created_at).toLocaleString("pt-BR")}</td><td className="whitespace-nowrap"><span className={status.label === "SLA estourado" ? "font-semibold text-rose-700" : ""}>{remainingSla(ticket.resolution_due_at)}</span></td><td>{ticket.operational_status === "NEW" ? <form action={sendToTriage}><input name="ticketId" type="hidden" value={ticket.id} /><button className="font-semibold text-cyan-700" type="submit">Triar</button></form> : ticket.operational_status === "TRIAGE" ? <form action={awaitScheduling}><input name="ticketId" type="hidden" value={ticket.id} /><button className="font-semibold text-cyan-700" type="submit">Agendar</button></form> : "—"}</td></tr>; })}{!sorted.length ? <tr><td colSpan={8} className="p-5 text-center text-slate-500">Nenhum chamado visível para suas organizações.</td></tr> : null}</tbody></table></div></section>;
}
