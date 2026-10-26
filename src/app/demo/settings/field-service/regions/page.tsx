"use client";

import Link from "next/link";
import { DemoSidebar } from "@/components/demo-sidebar";
import { FIELD_REGIONS } from "@/lib/field-service/regions";

export default function FieldRegionsPage() {
  return <main className="min-h-screen bg-slate-100 text-slate-900"><DemoSidebar active="field-service-settings" /><div data-oneit-sidebar-offset className="ml-64 min-h-screen"><header className="flex items-center justify-between border-b bg-white px-8 py-4"><div><p className="text-xs font-semibold tracking-[.15em] text-orange-500">ONEIT · CONFIGURAÇÕES · FIELD SERVICE</p><h1 className="mt-1 text-xl font-semibold">Classificação regional</h1></div><Link href="/demo/settings/field-service" className="rounded-lg border px-4 py-2 text-sm font-semibold">Voltar aos cadastros</Link></header><section className="p-8"><div className="rounded-xl bg-[#092f40] p-6 text-white"><p className="text-xs font-semibold tracking-[.15em] text-orange-300">INTELIGÊNCIA OPERACIONAL</p><h2 className="mt-2 text-2xl font-semibold">Regiões padronizadas dos polos</h2><p className="mt-1 text-sm text-slate-300">A classificação alimentará os gráficos de volume, deslocamento e distribuição de atendimentos.</p></div><section className="mt-5 rounded-xl border bg-white p-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{FIELD_REGIONS.map((region, index) => <article key={region} className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Região {index + 1}</p><p className="mt-2 font-semibold">{region}</p></article>)}</div></section></section></div></main>;
}
