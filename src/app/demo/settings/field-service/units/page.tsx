"use client";

import Link from "next/link";
import { DemoSidebar } from "@/components/demo-sidebar";
import { LPU_UNITS } from "@/lib/field-service/lpu-units";

export default function LpuUnitsPage() {
  return <main className="min-h-screen bg-slate-100 text-slate-900"><DemoSidebar active="settings" /><div data-oneit-sidebar-offset className="min-h-screen"><header className="border-b bg-white px-6 py-5"><p className="text-xs font-semibold uppercase tracking-wider text-sky-800">Configurações / Field Service</p><h1 className="mt-1 text-xl font-semibold">Unidades de medida</h1></header><section className="mx-auto max-w-4xl p-6"><nav aria-label="Parâmetros de Field Service" className="mb-5 flex flex-wrap gap-2 text-sm"><Link href="/demo/settings/field-service" className="rounded-lg border bg-white px-3 py-2">Cadastros</Link><Link href="/demo/settings/field-service/regions" className="rounded-lg border bg-white px-3 py-2">Regiões dos polos</Link><span aria-current="page" className="rounded-lg bg-sky-950 px-3 py-2 font-semibold text-white">Unidades de medida</span></nav><div className="rounded-xl border bg-white p-5"><p className="mb-4 text-sm text-slate-600">Unidades disponíveis para materiais, serviços e mão de obra da LPU.</p><ul className="divide-y">{LPU_UNITS.map((unit) => <li key={unit} className="py-3 text-sm font-medium">{unit}</li>)}</ul></div></section></div></main>;
}
