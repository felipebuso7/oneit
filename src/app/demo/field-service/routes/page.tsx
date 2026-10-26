"use client";

import { useEffect, useMemo, useState } from "react";
import { DemoSidebar } from "@/components/demo-sidebar";

type Visit = { id?: string; ticket: string; title: string; technician: string; team?: string; plannedAt?: string; window?: string; address: string; state: string; priority?: string; sla?: string; routeOrder?: number };
const key = "oneit.demo.field-visits.v1";
const activeStates = new Set(["Despachado", "Em deslocamento", "Check-in", "Em atendimento", "Check-out", "Fila de despacho"]);

function normalize(raw: Visit, index: number): Required<Visit> {
  return { id: raw.id ?? raw.ticket + "-" + index, ticket: raw.ticket, title: raw.title, technician: raw.technician || "Não atribuído", team: raw.team ?? "Sem equipe", plannedAt: raw.plannedAt ?? "", window: raw.window ?? "", address: raw.address ?? "Endereço não informado", state: raw.state ?? "Fila de despacho", priority: raw.priority ?? "P3", sla: raw.sla ?? "SLA a definir", routeOrder: raw.routeOrder ?? index + 1 };
}

export default function RoutePlanningPage() {
  const [visits, setVisits] = useState<Required<Visit>[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [date, setDate] = useState("");
  const [notice, setNotice] = useState("Selecione uma data para organizar a rota por técnico.");
  useEffect(() => { const timer = window.setTimeout(() => { try { const raw = JSON.parse(localStorage.getItem(key) ?? "[]"); if (Array.isArray(raw)) setVisits(raw.map(normalize)); } catch { setNotice("Não foi possível recuperar as visitas locais."); } finally { setHydrated(true); } }, 0); return () => window.clearTimeout(timer); }, []);
  useEffect(() => { if (hydrated) localStorage.setItem(key, JSON.stringify(visits)); }, [hydrated, visits]);
  const availableDates = useMemo(() => [...new Set(visits.filter((visit) => visit.plannedAt).map((visit) => visit.plannedAt))].sort(), [visits]);
  const targetDate = date || availableDates[0] || "";
  const routed = useMemo(() => visits.filter((visit) => activeStates.has(visit.state) && visit.plannedAt === targetDate).sort((a, b) => a.technician.localeCompare(b.technician) || a.routeOrder - b.routeOrder), [targetDate, visits]);
  const teams = useMemo(() => Object.entries(routed.reduce<Record<string, Required<Visit>[]>>((groups, visit) => { groups[visit.technician] = [...(groups[visit.technician] ?? []), visit]; return groups; }, {})), [routed]);
  function move(technician: string, id: string, direction: -1 | 1) {
    const group = routed.filter((visit) => visit.technician === technician);
    const index = group.findIndex((visit) => visit.id === id);
    const other = group[index + direction];
    if (!other) { setNotice("Esta visita já está no limite da rota do técnico."); return; }
    setVisits((all) => all.map((visit) => visit.id === id ? { ...visit, routeOrder: other.routeOrder } : visit.id === other.id ? { ...visit, routeOrder: group[index].routeOrder } : visit));
    setNotice("Sequência da rota atualizada. Confirme o deslocamento com o técnico.");
  }
  return <main className="min-h-screen bg-slate-100 text-slate-900"><DemoSidebar active="field-service" /><div data-oneit-sidebar-offset className="ml-64 min-h-screen"><header className="flex items-center justify-between border-b bg-white px-8 py-4"><div><p className="text-xs font-semibold tracking-[.15em] text-orange-500">ONEIT · FIELD SERVICE · PLANEJAMENTO</p><h1 className="mt-1 text-xl font-semibold">Agenda e rotas físicas</h1></div><a href="/demo/field-service" className="rounded-lg border px-4 py-2 text-sm font-semibold">Voltar à Central</a></header><section className="p-8"><div className="rounded-xl bg-[#092f40] p-6 text-white"><p className="text-xs font-semibold tracking-[.15em] text-orange-300">CAPACIDADE DIÁRIA</p><h2 className="mt-2 text-2xl font-semibold">Organize a sequência de visitas por técnico</h2><p className="mt-1 text-sm text-slate-300">A rota é composta apenas por OS despachadas ou em execução. Reordene as paradas antes do deslocamento.</p></div><p role="status" className="mt-5 rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm">{notice}</p><div className="mt-5 flex flex-wrap items-end gap-3 rounded-xl border bg-white p-5"><label className="text-sm font-semibold">Data da rota<select value={targetDate} onChange={(event) => setDate(event.target.value)} className="ml-2 rounded-lg border p-2.5 font-normal"><option value="">Sem data</option>{availableDates.map((value) => <option key={value} value={value}>{new Date(value + "T00:00:00").toLocaleDateString("pt-BR")}</option>)}</select></label><span className="text-sm text-slate-500">{routed.length} visita(s) em {teams.length} técnico(s)</span></div><div className="mt-5 grid gap-5 xl:grid-cols-2">{teams.length ? teams.map(([technician, route]) => <section key={technician} className="overflow-hidden rounded-xl border bg-white"><header className="border-b bg-slate-50 p-5"><h2 className="font-semibold">{technician}</h2><p className="mt-1 text-sm text-slate-500">{route[0]?.team} · {route.length} parada(s) planejada(s)</p></header><ol className="divide-y">{route.map((visit, index) => <li key={visit.id} className="flex gap-3 p-4"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#092f40] text-xs font-bold text-white">{index + 1}</div><div className="min-w-0 flex-1"><p className="font-semibold">{visit.ticket} · {visit.title}</p><p className="mt-1 text-sm text-slate-600">{visit.address}</p><p className="mt-1 text-xs text-slate-500">{visit.window || "Janela não definida"} · {visit.priority} · {visit.sla}</p><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => move(technician, visit.id, -1)} className="rounded-md border px-2.5 py-1 text-xs font-semibold">↑ Priorizar</button><button onClick={() => move(technician, visit.id, 1)} className="rounded-md border px-2.5 py-1 text-xs font-semibold">↓ Rebaixar</button><a href={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(visit.address)} target="_blank" rel="noreferrer" className="rounded-md border px-2.5 py-1 text-xs font-semibold">Mapa</a></div></div></li>)}</ol></section>) : <section className="rounded-xl border bg-white p-8 text-sm text-slate-500">Não há OS despachadas para esta data. Crie um despacho na Central e informe o agendamento previsto.</section>}</div><p className="mt-5 text-xs text-slate-500">Nesta versão, a sequência é manual e o mapa abre o endereço de cada polo. Otimização automática de percurso exige integração futura com um provedor de mapas e dados geográficos confiáveis.</p></section></div></main>;
}

