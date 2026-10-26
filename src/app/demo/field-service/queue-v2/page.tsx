"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DemoSidebar } from "@/components/demo-sidebar";
import { OneitStatusBadge } from "@/components/oneit-design-system";

type Visit = {
  id: string;
  ticket: string;
  title: string;
  company?: string;
  department?: string;
  region?: string;
  technician?: string;
  plannedAt?: string;
  window?: string;
  priority?: string;
  state?: string;
};

type Filter = "Todas" | "A despachar" | "Agendadas" | "Em campo" | "Para validar" | "Concluídas";
const storageKey = "oneit.demo.field-visits.v1";
const reviewState = "Aguardando validação do gestor";
const filters: Filter[] = ["Todas", "A despachar", "Agendadas", "Em campo", "Para validar", "Concluídas"];
const inField = new Set(["Em deslocamento", "Check-in", "Em atendimento", "Check-out"]);
const priorityRank: Record<string, number> = { P1: 0, P2: 1, P3: 2, P4: 3 };

function matchesFilter(visit: Visit, filter: Filter) {
  if (filter === "Todas") return true;
  if (filter === "A despachar") return visit.state === "Fila de despacho";
  if (filter === "Agendadas") return visit.state === "Despachado";
  if (filter === "Em campo") return inField.has(visit.state ?? "");
  if (filter === "Para validar") return visit.state === reviewState;
  return visit.state === "Concluído";
}

function plannedDatePassed(visit: Visit) {
  if (!visit.plannedAt || visit.state === "Concluído" || visit.state === reviewState) return false;
  const day = visit.plannedAt.slice(0, 10);
  const date = new Date(day + "T23:59:59");
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}

function statusTone(state?: string): "neutral" | "info" | "warning" | "danger" | "success" {
  if (state === reviewState) return "warning";
  if (state === "Concluído") return "success";
  if (state === "Fila de despacho") return "danger";
  if (state === "Despachado") return "info";
  return "neutral";
}

function nextAction(visit: Visit) {
  const ticket = encodeURIComponent(visit.ticket);
  if (visit.state === "Fila de despacho") return { label: "Planejar", href: "/demo/field-service/dispatch?ticket=" + ticket };
  if (visit.state === reviewState) return { label: "Conferir", href: "/demo/field-service/validation-v2?ticket=" + ticket };
  return { label: "Abrir OS", href: "/demo/field-service?ticket=" + ticket };
}

function dateLabel(value?: string) {
  if (!value) return "A definir";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? match[3] + "/" + match[2] + "/" + match[1] : value;
}

export default function FieldServiceQueueV2Page() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("Todas");
  const [region, setRegion] = useState("");

  useEffect(() => {
    const read = () => {
      try {
        const stored = JSON.parse(localStorage.getItem(storageKey) ?? "[]") as unknown;
        setVisits(Array.isArray(stored) ? stored.filter((item): item is Visit => Boolean(item && typeof item === "object" && typeof item.id === "string" && typeof item.ticket === "string")) : []);
      } catch { setVisits([]); }
    };
    read();
    window.addEventListener("focus", read);
    window.addEventListener("storage", read);
    window.addEventListener("oneit-demo-field-visits-updated", read);
    return () => {
      window.removeEventListener("focus", read);
      window.removeEventListener("storage", read);
      window.removeEventListener("oneit-demo-field-visits-updated", read);
    };
  }, []);

  const regions = useMemo(() => [...new Set(visits.map((visit) => visit.region).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, "pt-BR")), [visits]);
  const counts = useMemo(() => Object.fromEntries(filters.map((item) => [item, visits.filter((visit) => matchesFilter(visit, item)).length])) as Record<Filter, number>, [visits]);
  const visible = useMemo(() => visits.filter((visit) => {
    const searchable = [visit.ticket, visit.title, visit.company, visit.department, visit.region, visit.technician].join(" ").toLocaleLowerCase("pt-BR");
    return matchesFilter(visit, filter) && (!region || visit.region === region) && searchable.includes(query.trim().toLocaleLowerCase("pt-BR"));
  }).sort((a, b) => Number(plannedDatePassed(b)) - Number(plannedDatePassed(a)) || (priorityRank[a.priority ?? "P3"] ?? 2) - (priorityRank[b.priority ?? "P3"] ?? 2) || (a.plannedAt ?? "9999").localeCompare(b.plannedAt ?? "9999")), [visits, filter, region, query]);

  return <main className="min-h-screen bg-[#f5f7fa] text-slate-900">
    <DemoSidebar active="field-queue" />
    <div data-oneit-sidebar-offset className="min-h-screen min-w-0">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 lg:px-8">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#0b4b78]">Operação / Field Service</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#062c59]">Fila Field Service</h1>
          <p className="mt-1 text-sm text-slate-600">Encontre a OS e execute a próxima ação.</p>
        </div>
        <Link href="/demo/field-service/routes" className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-[#062c59] hover:bg-slate-50">Ver agenda e rotas</Link>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-4 p-4 lg:p-7">
        {visits.length > 0 && <nav aria-label="Filtrar situação das OS" className="grid grid-cols-2 gap-1 border-b border-slate-200 sm:grid-cols-3 md:flex md:overflow-x-auto">
          {filters.map((item) => <button key={item} type="button" aria-current={filter === item ? "page" : undefined} onClick={() => setFilter(item)} className={"flex min-h-11 min-w-0 items-center justify-center gap-2 border-b-2 px-2 text-sm font-medium md:shrink-0 md:px-3 " + (filter === item ? "border-[#062c59] text-[#062c59]" : "border-transparent text-slate-600 hover:text-[#062c59]")}>
            {item}<span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs tabular-nums text-slate-700">{counts[item]}</span>
          </button>)}
        </nav>}

        <section aria-label="Lista de ordens de serviço" className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {visits.length > 0 && <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
            <label className="min-w-[200px] flex-1"><span className="sr-only">Buscar OS</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar OS, serviço, polo ou técnico" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" /></label>
            <label><span className="sr-only">Filtrar região</span><select value={region} onChange={(event) => setRegion(event.target.value)} className="h-10 max-w-[190px] rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="">Todas as regiões</option>{regions.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            <span className="text-xs text-slate-500">{visible.length} OS exibidas</span>
          </div>}

          {visible.length ? <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">OS / serviço</th><th className="px-4 py-3">Polo / região</th><th className="px-4 py-3">Situação</th><th className="px-4 py-3">Técnico</th><th className="px-4 py-3">Agendamento</th><th className="px-4 py-3 text-right">Próxima ação</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{visible.map((visit) => { const action = nextAction(visit); return <tr key={visit.id} className="hover:bg-slate-50">
                  <td className="max-w-[250px] px-4 py-3"><strong className="block text-[#062c59]">{visit.ticket}</strong><span className="block truncate text-xs text-slate-600" title={visit.title}>{visit.title}</span></td>
                  <td className="px-4 py-3"><span className="block font-medium">{visit.department || visit.company || "Não informado"}</span><span className="block text-xs text-slate-500">{visit.region || "Região a definir"}</span></td>
                  <td className="px-4 py-3"><OneitStatusBadge tone={statusTone(visit.state)}>{visit.state || "Sem status"}</OneitStatusBadge>{plannedDatePassed(visit) && <span className="mt-1 block text-xs font-semibold text-red-700">Data planejada passou</span>}</td>
                  <td className="px-4 py-3">{visit.technician || "A atribuir"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{dateLabel(visit.plannedAt)}{visit.window && <span className="block text-xs text-slate-500">{visit.window}</span>}</td>
                  <td className="px-4 py-3 text-right"><Link href={action.href} className="font-semibold text-[#0b4b78] hover:underline">{action.label} →</Link></td>
                </tr>; })}</tbody>
              </table>
            </div>
            <div className="divide-y divide-slate-100 md:hidden">{visible.map((visit) => { const action = nextAction(visit); return <article key={visit.id} className="space-y-2 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-[#062c59]">{visit.ticket}</strong><OneitStatusBadge tone={statusTone(visit.state)}>{visit.state || "Sem status"}</OneitStatusBadge></div>
              <p className="text-sm font-medium">{visit.title}</p>
              <p className="text-xs text-slate-600">{visit.department || visit.company || "Polo a definir"} · {visit.technician || "A atribuir"} · {dateLabel(visit.plannedAt)}</p>
              <Link href={action.href} className="inline-flex min-h-10 items-center text-sm font-semibold text-[#0b4b78]">{action.label} →</Link>
            </article>; })}</div>
          </> : <div className="px-6 py-14 text-center"><h2 className="font-semibold text-[#062c59]">{visits.length ? "Nenhuma OS corresponde aos filtros" : "Nenhuma OS em Field Service"}</h2><p className="mt-2 text-sm text-slate-600">{visits.length ? "Altere a situação, região ou busca." : "Abra um chamado em Chamados e encaminhe a visita para o Field Service."}</p>{!visits.length && <Link href="/demo/tickets" className="mt-4 inline-flex min-h-10 items-center font-semibold text-[#0b4b78] hover:underline">Abrir chamados →</Link>}</div>}
        </section>
      </div>
    </div>
  </main>;
}
