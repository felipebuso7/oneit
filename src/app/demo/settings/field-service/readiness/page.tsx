"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DemoSidebar } from "@/components/demo-sidebar";

type Check = { label: string; href: string; key: string };
const checks: Check[] = [
  { label: "Técnicos cadastrados", href: "/demo/technicians", key: "oneit.demo.technicians.v1" },
  { label: "Empresas e polos cadastrados", href: "/demo/settings", key: "oneit.demo.settings.v1" },
  { label: "Itens de LPU cadastrados", href: "/demo/field-service/settings/composition", key: "oneit.demo.field-lpu.v1" },
];

export default function FieldServiceReadinessPage() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    const next: Record<string, number> = {};
    for (const check of checks) {
      try { const value = JSON.parse(window.localStorage.getItem(check.key) ?? "[]") as unknown; next[check.key] = Array.isArray(value) ? value.length : 0; } catch { next[check.key] = 0; }
    }
    setCounts(next);
  }, []);
  const ready = checks.filter((check) => (counts[check.key] ?? 0) > 0).length;
  return <main className="min-h-screen bg-slate-100 text-slate-900"><DemoSidebar active="settings" /><div data-oneit-sidebar-offset className="ml-64 min-h-screen"><header className="border-b bg-white px-8 py-5"><p className="text-xs font-semibold tracking-[.15em] text-orange-500">ONEIT · CONFIGURAÇÕES</p><div className="mt-1 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-xl font-semibold">Prontidão operacional</h1><p className="mt-1 text-sm text-slate-500">Confira se a base mínima está preparada antes de liberar novos despachos.</p></div><Link href="/demo/settings/field-service" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Voltar aos cadastros</Link></div></header><section className="p-8"><div className="rounded-xl bg-[#092f40] p-6 text-white"><p className="text-xs font-semibold uppercase tracking-[.15em] text-orange-300">Checklist de operação</p><h2 className="mt-2 text-2xl font-semibold">{ready} de {checks.length} pré-requisitos atendidos</h2><p className="mt-1 text-sm text-slate-300">Cadastros incompletos podem gerar OS sem técnico, endereço ou precificação.</p></div><div className="mt-6 grid gap-4">{checks.map((check) => { const count = counts[check.key] ?? 0; const ok = count > 0; return <article key={check.key} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white p-5 shadow-sm"><div><p className="font-semibold">{check.label}</p><p className="mt-1 text-sm text-slate-500">{count} registro(s) disponível(is)</p></div><div className="flex items-center gap-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${ok ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{ok ? "Pronto" : "Pendente"}</span><Link href={check.href} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">{ok ? "Revisar" : "Cadastrar"}</Link></div></article>; })}</div></section></div></main>;
}
