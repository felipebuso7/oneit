"use client";

import Link from "next/link";
import { DemoSidebar } from "@/components/demo-sidebar";
import { FIELD_REGIONS } from "@/lib/field-service/regions";

export default function FieldRegionsPage() {
  return <main className="min-h-screen bg-slate-100 text-slate-900"><DemoSidebar active="settings" /><div data-oneit-sidebar-offset className="min-h-screen"><header className="border-b bg-white px-6 py-5"><p className="text-xs font-semibold uppercase tracking-wider text-sky-800">Configurações / Field Service</p><h1 className="mt-1 text-xl font-semibold">Regiões dos polos</h1></header><section className="mx-auto max-w-4xl p-6"><nav aria-label="Parâmetros de Field Service" className="mb-5 flex flex-wrap gap-2 text-sm"><Link href="/demo/settings/field-service" className="rounded-lg border bg-white px-3 py-2">Cadastros</Link><span aria-current="page" className="rounded-lg bg-sky-950 px-3 py-2 font-semibold text-white">Regiões dos polos</span><Link href="/demo/settings/field-service/units" className="rounded-lg border bg-white px-3 py-2">Unidades de medida</Link></nav><div className="rounded-xl border bg-white p-5"><p className="mb-4 text-sm text-slate-600">Use estas classificações no cadastro de cada polo para analisar os atendimentos por região.</p><ul className="divide-y">{FIELD_REGIONS.map((region) => <li key={region} className="py-3 text-sm font-medium">{region}</li>)}</ul></div></section></div></main>;
}
