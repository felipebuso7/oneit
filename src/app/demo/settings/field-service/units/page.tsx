"use client";

import Link from "next/link";
import { DemoSidebar } from "@/components/demo-sidebar";
import { LPU_UNITS } from "@/lib/field-service/lpu-units";

export default function LpuUnitsPage() {
  return <main className="min-h-screen bg-slate-100 text-slate-900"><DemoSidebar active="field-service-settings" /><div data-oneit-sidebar-offset className="ml-64 min-h-screen"><header className="flex items-center justify-between border-b bg-white px-8 py-4"><div><p className="text-xs font-semibold tracking-[.15em] text-orange-500">ONEIT · CONFIGURAÇÕES · FIELD SERVICE</p><h1 className="mt-1 text-xl font-semibold">Unidades de medida</h1></div><Link href="/demo/settings/field-service" className="rounded-lg border px-4 py-2 text-sm font-semibold">Voltar aos cadastros</Link></header><section className="p-8"><div className="rounded-xl bg-[#092f40] p-6 text-white"><p className="text-xs font-semibold tracking-[.15em] text-orange-300">DOMÍNIO DE PRECIFICAÇÃO</p><h2 className="mt-2 text-2xl font-semibold">Unidades padronizadas da LPU</h2><p className="mt-1 text-sm text-slate-300">As unidades abaixo são usadas para materiais, mão de obra, visitas e deslocamentos.</p></div><section className="mt-5 rounded-xl border bg-white p-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{LPU_UNITS.map((unit) => <article key={unit} className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="text-xs uppercase tracking-wide text-slate-500">Unidade válida</p><p className="mt-2 text-lg font-semibold">{unit}</p></article>)}</div><p className="mt-5 rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-950">Exemplo: cabo de rede usa <strong>metro</strong>; RJ45 usa <strong>unidade</strong>.</p></section></section></div></main>;
}
