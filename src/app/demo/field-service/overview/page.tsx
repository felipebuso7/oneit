"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DemoSidebar } from "@/components/demo-sidebar";
import { OneitStatusBadge } from "@/components/oneit-design-system";

type Visit = { state?: string; quotedAmount?: number; materials?: Array<{ quantity?: number; unitPrice?: number }> };
const storageKey = "oneit.demo.field-visits.v1";
const executionStates = ["Despachado", "Em deslocamento", "Check-in", "Em atendimento", "Check-out"];
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function FieldServiceOverviewPage() {
  const [visits, setVisits] = useState<Visit[]>([]);

  useEffect(() => {
    const read = () => {
      try {
        const value = JSON.parse(localStorage.getItem(storageKey) ?? "[]") as unknown;
        setVisits(Array.isArray(value) ? value : []);
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

  const summary = useMemo(() => ({
    dispatch: visits.filter((visit) => visit.state === "Fila de despacho").length,
    execution: visits.filter((visit) => executionStates.includes(visit.state ?? "")).length,
    validation: visits.filter((visit) => visit.state === "Aguardando validação do gestor").length,
    completed: visits.filter((visit) => visit.state === "Concluído").length,
    measured: visits.filter((visit) => visit.state === "Concluído").reduce((sum, visit) => sum + Number(visit.quotedAmount ?? 0) + (visit.materials ?? []).reduce((materialSum, item) => materialSum + Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0), 0), 0),
  }), [visits]);

  const actions = [
    { title: "Aguardando despacho", description: "Definir técnico e horário para a visita", count: summary.dispatch, href: "/demo/field-service/queue-v2", label: "Abrir fila" },
    { title: "Em campo", description: "Acompanhar deslocamento e execução", count: summary.execution, href: "/demo/field-service/queue-v2", label: "Acompanhar" },
    { title: "Aguardando validação", description: "Conferir entrega técnica e decidir", count: summary.validation, href: "/demo/field-service/validation-v2", label: "Validar OS" },
  ];

  return <main className="min-h-screen bg-[#f5f7fa] text-slate-900">
    <DemoSidebar active="field-overview" />
    <div data-oneit-sidebar-offset className="min-h-screen min-w-0">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 lg:px-8">
        <div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#0b4b78]">Operação / Field Service</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#062c59]">Visão geral</h1><p className="mt-1 text-sm text-slate-600">O que precisa da atenção do gestor agora.</p></div>
        <Link href="/demo/field-service/queue-v2" className="inline-flex min-h-10 items-center rounded-lg bg-[#062c59] px-4 text-sm font-semibold text-white hover:bg-[#0b4b78]">Abrir fila Field Service</Link>
      </header>

      <div className="mx-auto max-w-5xl space-y-5 p-4 lg:p-7">
        <section aria-label="Indicadores do Field Service" className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-white lg:grid-cols-4">
          <div className="border-b border-r border-slate-100 px-5 py-4 lg:border-b-0"><p className="text-xs text-slate-500">Aguardando despacho</p><strong className="mt-1 block text-2xl tabular-nums text-[#062c59]">{summary.dispatch}</strong></div>
          <div className="border-b border-slate-100 px-5 py-4 lg:border-b-0 lg:border-r"><p className="text-xs text-slate-500">Em campo</p><strong className="mt-1 block text-2xl tabular-nums text-[#062c59]">{summary.execution}</strong></div>
          <div className="border-r border-slate-100 px-5 py-4"><p className="text-xs text-slate-500">Para validar</p><strong className="mt-1 block text-2xl tabular-nums text-[#062c59]">{summary.validation}</strong></div>
          <div className="px-5 py-4"><p className="text-xs text-slate-500">OS concluídas</p><strong className="mt-1 block text-2xl tabular-nums text-[#062c59]">{summary.completed}</strong></div>
        </section>

        <section aria-label="Próximas decisões" className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-[#062c59]">Próximas decisões</h2><p className="mt-1 text-sm text-slate-500">Selecione a etapa para trabalhar na fila correspondente.</p></div>
          <div className="divide-y divide-slate-100">{actions.map((item) => <Link key={item.title} href={item.href} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50"><div className="flex items-center gap-3"><OneitStatusBadge tone={item.count ? "info" : "neutral"}>{item.count}</OneitStatusBadge><div><strong className="text-sm text-[#062c59]">{item.title}</strong><p className="mt-0.5 text-xs text-slate-500">{item.description}</p></div></div><span className="text-sm font-semibold text-[#0b4b78]">{item.label} →</span></Link>)}</div>
        </section>

        <p className="text-sm text-slate-600">Valor das OS concluídas nesta demonstração: <strong className="text-[#062c59]">{money.format(summary.measured)}</strong>. A medição oficial e o BM devem ser conferidos no módulo Faturamento.</p>
      </div>
    </div>
  </main>;
}
