"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DemoSidebar } from "@/components/demo-sidebar";

type Ticket = { id: string; subject: string; requester: string; technician: string; priority: string; sla: string; status: "Aberto" | "Pendente" | "SLA vencido" | "Fechado"; department: string; service: string; createdAt: number };
type Visit = { ticket: string; state: "Despachado" | "Em deslocamento" | "No local" | "Concluído"; department?: string; completedAt?: string; materials?: { description: string; quantity: number }[] };
type Satisfaction = { ticketId: string; rating: number; comment: string; submittedAt: string };
type Department = { name: string; region?: string };

const fallbackTickets: Ticket[] = [
  { id: "INC-0142", subject: "VPN indisponível para operação comercial", requester: "Rafael Bonato", technician: "Felipe Buso", priority: "P1", sla: "18 min", status: "SLA vencido", department: "Comercial", service: "Acesso remoto · Incidente", createdAt: 5 },
  { id: "REQ-0289", subject: "Preparação de notebook para novo colaborador", requester: "Mariana Lopes", technician: "Camila Souza", priority: "P3", sla: "4h 12m", status: "Aberto", department: "Pessoas e Cultura", service: "Equipamentos · Novo notebook", createdAt: 4 },
  { id: "INC-0141", subject: "Falha de impressão no centro de distribuição", requester: "Lucas Mendes", technician: "Rafael Bonato", priority: "P2", sla: "1h 08m", status: "Pendente", department: "Logística", service: "Impressão · Incidente", createdAt: 3 },
  { id: "REQ-0287", subject: "Acesso a grupo corporativo", requester: "Ana Ribeiro", technician: "Felipe Buso", priority: "P4", sla: "Em pausa", status: "Pendente", department: "Financeiro", service: "Identidade · Grupo corporativo", createdAt: 2 },
];

const uniqueTickets = (items: Ticket[]) => items.filter((ticket, index, collection) => collection.findIndex((candidate) => candidate.id === ticket.id) === index);

export default function DemoPage() {
  const [tickets, setTickets] = useState<Ticket[]>(fallbackTickets);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [satisfaction, setSatisfaction] = useState<Satisfaction[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [competence, setCompetence] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    try {
      const savedTickets = JSON.parse(window.localStorage.getItem("oneit.demo.tickets.v1") ?? "{}") as { tickets?: Ticket[] };
      const savedVisits = JSON.parse(window.localStorage.getItem("oneit.demo.field-visits.v1") ?? "[]") as Visit[];
      const savedSatisfaction = JSON.parse(window.localStorage.getItem("oneit.demo.satisfaction.v1") ?? "[]") as Satisfaction[];
      const savedSettings = JSON.parse(window.localStorage.getItem("oneit.demo.settings.v1") ?? "{}") as { departments?: Department[] };
      // Os dados demonstrativos são hidratados do localStorage uma única vez ao montar a página.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (Array.isArray(savedTickets.tickets) && savedTickets.tickets.length > 0) setTickets(uniqueTickets(savedTickets.tickets));
      if (Array.isArray(savedVisits)) setVisits(savedVisits);
      if (Array.isArray(savedSatisfaction)) setSatisfaction(savedSatisfaction);
      if (Array.isArray(savedSettings.departments)) setDepartments(savedSettings.departments);
    } catch {
      // Mantém indicadores iniciais quando não há dados locais válidos.
    }
  }, []);

  const openTickets = tickets.filter((ticket) => ticket.status !== "Fechado").length;
  const withinSla = tickets.length === 0 ? 0 : Math.round((tickets.filter((ticket) => ticket.status !== "SLA vencido").length / tickets.length) * 100);
  const critical = tickets.filter((ticket) => ticket.priority === "P1" && ticket.status !== "Fechado").length;
  const competenceVisits = visits.filter((visit) => !visit.completedAt || visit.completedAt.startsWith(competence));
  const fieldVisits = competenceVisits.filter((visit) => visit.state !== "Concluído").length;
  const satisfactionAverage = satisfaction.length ? (satisfaction.reduce((total, item) => total + item.rating, 0) / satisfaction.length).toFixed(1) : "—";
  const monthlyBilling = tickets.filter((ticket) => ticket.status === "Fechado").length * 1250;
  const poloBars = useMemo(() => barsFrom(tickets.map((ticket) => ticket.department || "Sem polo")), [tickets]);
  const subcategoryBars = useMemo(() => barsFrom(tickets.map((ticket) => ticket.service.split(" · ").at(-1) || "Sem subcategoria")), [tickets]);
  const materialBars = useMemo(() => weightedBars(competenceVisits.flatMap((visit) => (visit.materials ?? []).map((item) => ({ label: item.description, value: Number(item.quantity || 0) })))), [competenceVisits]);
  const regionBars = useMemo(() => barsFrom(tickets.map((ticket) => departments.find((department) => department.name === ticket.department)?.region || (ticket.department === "Logística" ? "Região Metropolitana" : ticket.department === "Comercial" ? "Grande SP" : "Interior até 100 km"))), [departments, tickets]);

  return <main className="min-h-screen bg-slate-100 text-slate-900">
    <DemoSidebar active="overview" />
    <div data-oneit-sidebar-offset className="ml-64 min-h-screen">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-8 py-4"><div><p className="text-xs font-semibold tracking-[.15em] text-[#146272]">ONEIT · DASHBOARD</p><h1 className="mt-1 text-xl font-semibold">Dashboard operacional</h1></div><div className="flex items-center gap-3"><label className="text-xs font-semibold text-slate-500">Competência<input type="month" value={competence} onChange={(event) => setCompetence(event.target.value)} className="ml-2 rounded-lg border border-slate-300 px-2 py-1 text-sm font-normal text-slate-800" /></label><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Ambiente demonstrativo</span><Link href="/" className="text-sm text-slate-600 hover:text-slate-900">Sair da demo</Link></div></header>
      <section className="p-8">
        <div className="rounded-xl bg-[#092f40] px-7 py-6 text-white"><p className="text-xs font-semibold tracking-[.15em] text-cyan-300">DASHBOARD · COMPETÊNCIA {competence}</p><h2 className="mt-2 text-2xl font-semibold">Resumo executivo da operação</h2><p className="mt-1 text-sm text-slate-300">Indicadores calculados a partir dos chamados, despachos e avaliações criados neste ambiente.</p></div>
        <div aria-live="polite" aria-label="Indicadores operacionais" className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><Metric title="Abertos" value={String(openTickets)} /><Metric title="Dentro do SLA" value={String(withinSla) + "%"} tone="text-emerald-700" /><Metric title="Críticos" value={String(critical)} tone="text-red-700" /><Metric title="OS em campo" value={String(fieldVisits)} /><Metric title="Satisfação" value={satisfaction.length ? satisfactionAverage + "/5" : "—"} tone="text-emerald-700" /></div>
         <div className="mt-6 grid gap-5 lg:grid-cols-2"><section className="rounded-xl border bg-white p-5"><h3 className="font-semibold">Distribuição operacional</h3><p className="mt-1 text-sm text-slate-500">Indicadores consolidados da competência atual.</p><div className="mt-5 space-y-4"><Progress label="Chamados abertos" value={openTickets} total={Math.max(tickets.length, 1)} tone="bg-[#146272]" /><Progress label="OS em campo" value={fieldVisits} total={Math.max(tickets.length, 1)} tone="bg-[#123f99]" /><Progress label="Chamados críticos" value={critical} total={Math.max(tickets.length, 1)} tone="bg-slate-500" /></div></section><section className="rounded-xl border bg-white p-5"><h3 className="font-semibold">Faturamento da competência</h3><p className="mt-1 text-sm text-slate-500">Base demonstrativa: chamados fechados no mês.</p><p className="mt-6 text-3xl font-semibold text-[#123f99]">R$ {monthlyBilling.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p><div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#123f99]" style={{ width: monthlyBilling ? "72%" : "0%" }} /></div><p className="mt-2 text-xs text-slate-500">A integração financeira poderá substituir a base demonstrativa por medições reais.</p></section></div>
        <div className="mt-6 grid gap-5 lg:grid-cols-2"><BarCard title="Atendimentos por polo" subtitle="Volume de chamados por localidade" bars={poloBars} /><BarCard title="Chamados por subcategoria" subtitle="Classificação do catálogo de serviços" bars={subcategoryBars} /></div>
        <div className="mt-5"><BarCard title="Distribuição por região" subtitle="Agrupamento regional dos polos para gestão de cobertura" bars={regionBars} /></div>
        <section className="mt-5 rounded-xl border bg-white p-5"><h3 className="font-semibold">Materiais mais utilizados</h3><p className="mt-1 text-sm text-slate-500">Consumo registrado nas OS de campo da competência.</p><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{materialBars.length ? materialBars.slice(0, 8).map((bar) => <div key={bar.label} className="rounded-lg bg-slate-50 p-3"><div className="flex items-center justify-between gap-2 text-sm"><span className="truncate">{bar.label}</span><strong>{bar.value}</strong></div><div className="mt-2 h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-[#146272]" style={{ width: `${(bar.value / materialBars[0].value) * 100}%` }} /></div></div>) : <p className="text-sm text-slate-500">Nenhum material registrado na competência.</p>}</div></section>
        <div className="mt-5 flex flex-wrap gap-3"><Link href="/demo/tickets" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Abrir fila de chamados</Link><Link href="/demo/field-service/overview" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Abrir Field Service</Link><Link href="/demo/reports" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Ver relatórios</Link></div>
      </section>
    </div>
  </main>;
}

function Metric({ title, value, tone = "text-slate-900" }: { title: string; value: string; tone?: string }) {
  return <article className="rounded-xl border bg-white p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p><p className={"mt-2 text-2xl font-semibold " + tone}>{value}</p></article>;
}

function Progress({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  const percent = Math.min(100, (value / Math.max(total, 1)) * 100);
  return <div><div className="flex justify-between text-sm"><span>{label}</span><strong>{value}</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.min(value, total)}><div className={"h-full rounded-full " + tone} style={{ width: `${percent}%` }} /></div></div>;
}

function barsFrom(values: string[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

function weightedBars(values: { label: string; value: number }[]) {
  const counts = new Map<string, number>();
  values.forEach((item) => counts.set(item.label, (counts.get(item.label) ?? 0) + (Number.isFinite(item.value) ? item.value : 0)));
  return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

function BarCard({ title, subtitle, bars }: { title: string; subtitle: string; bars: { label: string; value: number }[] }) {
  const max = Math.max(1, bars[0]?.value ?? 0);
  return <section className="rounded-xl border bg-white p-5"><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm text-slate-500">{subtitle}</p><div className="mt-5 space-y-3">{bars.length ? bars.slice(0, 6).map((bar) => <div key={bar.label}><div className="flex justify-between gap-3 text-sm"><span className="truncate">{bar.label}</span><strong>{bar.value}</strong></div><div className="mt-1 h-3 rounded-full bg-slate-100" role="img" aria-label={`${bar.label}: ${bar.value}`}><div className="h-3 rounded-full bg-[#123f99]" style={{ width: `${(bar.value / max) * 100}%` }} /></div></div>) : <p className="text-sm text-slate-500">Nenhum dado na competência.</p>}</div></section>;
}

