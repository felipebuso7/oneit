"use client";

import Link from "next/link";
import { DemoSidebar } from "@/components/demo-sidebar";

export default function DemoSgstiTemplatesPage() {
  return <main className="min-h-screen bg-[#f5f6f8] text-slate-900"><DemoSidebar active="sgsti-templates" /><div data-oneit-sidebar-offset className="ml-64 min-h-screen"><header className="flex min-h-[62px] items-center border-b border-slate-300 bg-white px-5"><div><p className="text-[11px] font-semibold tracking-[.15em] text-orange-500">ONEIT · SGSTI</p><h1 className="mt-0.5 text-lg font-semibold">Cadastro de ritos</h1></div></header><section className="mx-auto max-w-2xl p-6"><article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-semibold">Cadastro centralizado em Configurações SGSTI</h2><p className="mt-2 text-sm text-slate-600">Para evitar que configurações se misturem à operação, os ritos, periodicidades, responsáveis e participantes previstos são mantidos na área administrativa.</p><Link href="/demo/settings/sgsti#ritos" className="mt-5 inline-flex rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white">Abrir cadastro de ritos</Link></article></section></div></main>;
}
