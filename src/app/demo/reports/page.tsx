"use client";

import { useEffect, useMemo, useState } from "react";
import { DemoSidebar } from "@/components/demo-sidebar";

type Ticket = { id: string; subject: string; priority: string; sla: string; status: "Aberto" | "Pendente" | "SLA vencido" | "Fechado"; technician: string; createdAt: number };
type Visit = { ticket: string; state: "Despachado" | "Em deslocamento" | "No local" | "Concluído" };
type SupplierRecord = { compliant: boolean; status: string };
type Satisfaction = { ticketId: string; rating: number; comment: string; submittedAt: string };

const fallback: Ticket[] = [{ id: "INC-0142", subject: "VPN indisponível para operação comercial", priority: "P1", sla: "18 min", status: "SLA vencido", technician: "Felipe Buso", createdAt: 5 }, { id: "REQ-0289", subject: "Preparação de notebook", priority: "P3", sla: "4h 12m", status: "Aberto", technician: "Camila Souza", createdAt: 4 }];

export default function ReportsDemoPage() {
  const [tickets, setTickets] = useState<Ticket[]>(fallback);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [supplierRecords, setSupplierRecords] = useState<SupplierRecord[]>([]);
  const [satisfaction, setSatisfaction] = useState<Satisfaction[]>([]);
  const [status, setStatus] = useState<"Todos" | Ticket["status"]>("Todos");
  useEffect(() => {
    try {
      const savedTickets = JSON.parse(window.localStorage.getItem("oneit.demo.tickets.v1") ?? "{}") as { tickets?: Ticket[] };
      const savedVisits = JSON.parse(window.localStorage.getItem("oneit.demo.field-visits.v1") ?? "[]") as Visit[];
      const savedSuppliers = JSON.parse(window.localStorage.getItem("oneit.demo.suppliers.v1") ?? "{}") as { records?: SupplierRecord[] };
      const savedSatisfaction = JSON.parse(window.localStorage.getItem("oneit.demo.satisfaction.v1") ?? "[]") as Satisfaction[];
      if (Array.isArray(savedTickets.tickets)) setTickets(savedTickets.tickets);
      if (Array.isArray(savedVisits)) setVisits(savedVisits);
      if (Array.isArray(savedSuppliers.records)) setSupplierRecords(savedSuppliers.records);
      if (Array.isArray(savedSatisfaction)) setSatisfaction(savedSatisfaction);
    } catch {
      // A visão inicial continua disponível quando não existirem dados locais.
    }
  }, []);
  const displayed = useMemo(() => tickets.filter((ticket) => status === "Todos" || ticket.status === status).sort((a, b) => b.createdAt - a.createdAt), [status, tickets]);
  const open = tickets.filter((ticket) => ticket.status !== "Fechado").length;
  const breached = tickets.filter((ticket) => ticket.status === "SLA vencido").length;
  const closed = tickets.filter((ticket) => ticket.status === "Fechado").length;
  const activeVisits = visits.filter((visit) => visit.state !== "Concluído").length;
  const supplierCompliance = supplierRecords.length ? Math.round((supplierRecords.filter((record) => record.compliant).length / supplierRecords.length) * 100) : 100;
  const satisfactionAverage = satisfaction.length ? (satisfaction.reduce((total, item) => total + item.rating, 0) / satisfaction.length).toFixed(1) : "—";
  return <main className="min-h-screen bg-slate-100 text-slate-900"><DemoSidebar active="reports" /><div data-oneit-sidebar-offset className="ml-64 min-h-screen"><header className="flex items-center justify-between border-b bg-white px-8 py-4"><div><p className="text-xs font-semibold tracking-[.15em] text-orange-500">ONEIT · RELATÓRIOS</p><h1 className="mt-1 text-xl font-semibold">Indicadores operacionais</h1></div><button type="button" onClick={() => window.print()} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Imprimir relatório</button></header><section className="p-8"><div className="rounded-xl bg-[#092f40] p-6 text-white"><p className="text-xs font-semibold tracking-[.15em] text-orange-300">GESTÃO DE SERVIÇOS</p><h2 className="mt-2 text-2xl font-semibold">Resumo para operação e governança</h2><p className="mt-1 text-sm text-slate-300">Indicadores calculados a partir dos dados gerados no portal demonstrativo, incluindo a percepção do solicitante.</p></div><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6"><Card label="Fila aberta" value={String(open)} /><Card label="SLA vencido" value={String(breached)} tone="text-red-700" /><Card label="Encerrados" value={String(closed)} tone="text-emerald-700" /><Card label="OS em campo" value={String(activeVisits)} /><Card label="SLA fornecedores" value={String(supplierCompliance) + "%"} tone="text-emerald-700" /><Card label="Satisfação média" value={satisfaction.length ? satisfactionAverage + "/5" : "—"} tone="text-emerald-700" /></div><div className="mt-6 rounded-xl border bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-5"><div><h2 className="font-semibold">Fila e conformidade de SLA</h2><p className="mt-1 text-sm text-slate-500">Use para priorizar incidentes, capacidade e ações de melhoria.</p></div><select value={status} onChange={(event) => setStatus(event.target.value as "Todos" | Ticket["status"])} className="rounded-lg border px-3 py-2 text-sm"><option value="Todos">Todos os status</option><option>Aberto</option><option>Pendente</option><option>SLA vencido</option><option>Fechado</option></select></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Chamado</th><th className="p-4">Prioridade</th><th className="p-4">Técnico</th><th className="p-4">SLA</th><th className="p-4">Status</th></tr></thead><tbody>{displayed.map((ticket) => <tr key={ticket.id} className="border-t"><td className="p-4"><p className="font-semibold text-[#0b4a64]">{ticket.id}</p><p className="text-xs text-slate-500">{ticket.subject}</p></td><td className="p-4">{ticket.priority}</td><td className="p-4">{ticket.technician}</td><td className="p-4">{ticket.sla}</td><td className="p-4"><span className={ticket.status === "SLA vencido" ? "font-semibold text-red-700" : ticket.status === "Fechado" ? "font-semibold text-emerald-700" : "font-semibold text-slate-700"}>{ticket.status}</span></td></tr>)}</tbody></table></div></div><div className="mt-6 rounded-xl border bg-white"><div className="border-b p-5"><p className="text-xs font-semibold tracking-[.14em] text-orange-500">EXPERIÊNCIA DO SOLICITANTE</p><h2 className="mt-1 font-semibold">Avaliações recentes</h2><p className="mt-1 text-sm text-slate-500">{satisfaction.length} avaliação(ões) registrada(s) em chamados encerrados.</p></div>{satisfaction.length ? <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Chamado</th><th className="p-4">Nota</th><th className="p-4">Comentário</th><th className="p-4">Registrado em</th></tr></thead><tbody>{satisfaction.slice().reverse().map((item) => <tr key={item.ticketId} className="border-t"><td className="p-4 font-semibold text-[#0b4a64]">{item.ticketId}</td><td className="p-4 font-semibold text-emerald-700">{item.rating}/5</td><td className="p-4 text-slate-700">{item.comment || "Sem comentário"}</td><td className="p-4 text-slate-500">{item.submittedAt}</td></tr>)}</tbody></table></div> : <p className="p-5 text-sm text-slate-500">Ainda não há avaliações registradas.</p>}</div></section></div></main>;
}

function Card({ label, value, tone = "text-slate-900" }: { label: string; value: string; tone?: string }) {
  return <article className="rounded-xl border bg-white p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className={"mt-2 text-2xl font-semibold " + tone}>{value}</p></article>;
}
