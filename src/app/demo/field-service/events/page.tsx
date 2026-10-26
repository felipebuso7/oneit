"use client";

import { useEffect, useMemo, useState } from "react";
import { DemoSidebar } from "@/components/demo-sidebar";
import { readFieldEvents, type FieldEvent } from "@/lib/demo/field-events";

export default function FieldServiceEventsPage() {
  const [events, setEvents] = useState<FieldEvent[]>([]);
  const [query, setQuery] = useState("");
  const [actor, setActor] = useState("Todos");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch("/api/field-events", { credentials: "include", cache: "no-store" });
          if (response.ok) {
            const payload = await response.json() as { events?: Array<{ id: string; ticket_id: string; event_type: string; technician_id?: string; occurred_at: string; location_justification?: string }> };
            const remoteEvents: FieldEvent[] = (payload.events ?? []).map((event) => ({ id: event.id, ticket: event.ticket_id, from: "API", to: event.event_type, actor: event.technician_id ?? "Técnico atribuído", at: event.occurred_at, details: event.location_justification ?? "Evento sincronizado pelo Field Service" }));
            setEvents(remoteEvents);
            return;
          }
        } catch { /* O modo demonstração segue disponível sem autenticação. */ }
        setEvents(readFieldEvents());
      })();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const actors = useMemo(() => ["Todos", ...Array.from(new Set(events.map((event) => event.actor).filter(Boolean))).sort()], [events]);
  const visible = useMemo(() => events.filter((event) => {
    const textMatches = [event.ticket, event.actor, event.from, event.to, event.details].join(" ").toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
    const actorMatches = actor === "Todos" || event.actor === actor;
    const eventDate = event.at.slice(0, 10);
    const fromMatches = !fromDate || eventDate >= fromDate;
    const toMatches = !toDate || eventDate <= toDate;
    return textMatches && actorMatches && fromMatches && toMatches;
  }), [events, query, actor, fromDate, toDate]);
  const clearFilters = () => { setQuery(""); setActor("Todos"); setFromDate(""); setToDate(""); };
  const exportCsv = () => {
    const header = ["Data/hora", "OS", "De", "Para", "Responsável", "Detalhe"];
    const rows = visible.map((event) => [new Date(event.at).toLocaleString("pt-BR"), event.ticket, event.from, event.to, event.actor, event.details]);
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `oneit-field-auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return <main className="min-h-screen bg-[#f5f6f8] text-slate-900"><DemoSidebar active="field-service" /><div data-oneit-sidebar-offset className="ml-64 min-h-screen"><header className="flex min-h-[62px] items-center justify-between border-b border-slate-300 bg-white px-5"><div><p className="text-[11px] font-semibold tracking-[.15em] text-orange-500">ONEIT · FIELD SERVICE</p><h1 className="mt-0.5 text-lg font-semibold">Auditoria operacional</h1></div><a href="/demo/field-service" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Voltar ao Field Service</a></header><section className="p-4 sm:p-6"><div className="rounded-xl border bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-cyan-700">Trilha de eventos</p><h2 className="mt-1 text-xl font-semibold">Histórico de transições das OS</h2><p className="mt-1 text-sm text-slate-500">Consulta local dos eventos registrados por técnicos e gestores.</p></div><div className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">{visible.length} de {events.length}</span><button type="button" onClick={exportCsv} disabled={!visible.length} className="rounded-lg bg-[#0b3b4b] px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Exportar CSV</button></div></div><div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_150px_150px_auto]"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filtrar por OS, estado ou motivo" className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" /><select value={actor} onChange={(event) => setActor(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"><option value="Todos">Todos os responsáveis</option>{actors.filter((item) => item !== "Todos").map((item) => <option key={item} value={item}>{item}</option>)}</select><label className="text-xs font-semibold text-slate-500">De<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900" /></label><label className="text-xs font-semibold text-slate-500">Até<input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900" /></label><button type="button" onClick={clearFilters} className="self-end rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700">Limpar</button></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-3">Data/hora</th><th className="p-3">OS</th><th className="p-3">Transição</th><th className="p-3">Responsável</th><th className="p-3">Detalhe</th></tr></thead><tbody>{visible.map((event) => <tr key={event.id} className="border-b last:border-0"><td className="p-3 whitespace-nowrap text-slate-500">{new Date(event.at).toLocaleString("pt-BR")}</td><td className="p-3 font-semibold text-[#123f99]">{event.ticket}</td><td className="p-3"><span className="rounded-full bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-800">{event.from} → {event.to}</span></td><td className="p-3">{event.actor}</td><td className="p-3 text-slate-600">{event.details}</td></tr>)}{!visible.length && <tr><td colSpan={5} className="p-8 text-center text-sm text-slate-500">Nenhum evento encontrado. Execute uma transição no fluxo do técnico ou gestor para registrar a primeira ocorrência.</td></tr>}</tbody></table></div></div></section></div></main>;
}
