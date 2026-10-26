"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DemoSidebar } from "@/components/demo-sidebar";

type Technician = { id: string; name: string; role: string; baseAddress?: string; availability?: string };

export default function TechnicianRoutingPage() {
  const [people, setPeople] = useState<Technician[]>([]);
  useEffect(() => { try { const saved = JSON.parse(window.localStorage.getItem("oneit.demo.technicians.v1") ?? "[]") as unknown; if (Array.isArray(saved)) setPeople(saved as Technician[]); } catch { setPeople([]); } }, []);
  const update = (id: string, patch: Partial<Technician>) => setPeople((items) => { const next = items.map((item) => item.id === id ? { ...item, ...patch } : item); window.localStorage.setItem("oneit.demo.technicians.v1", JSON.stringify(next)); return next; });
  return <main className="min-h-screen bg-slate-100 text-slate-900"><DemoSidebar active="technicians" /><div data-oneit-sidebar-offset className="ml-64 min-h-screen"><header className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-8 py-4"><div><p className="text-xs font-semibold tracking-[.15em] text-orange-500">ONEIT · CONFIGURAÇÕES · TÉCNICOS</p><h1 className="mt-1 text-xl font-semibold">Base e disponibilidade para rotas</h1></div><Link href="/demo/technicians" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Voltar ao cadastro</Link></header><section className="p-8"><div className="rounded-xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-600">Esses dados serão usados no cruzamento entre endereço do técnico, polo e chamado.</p><div className="mt-5 divide-y">{people.map((person) => <article key={person.id} className="grid gap-3 py-5 lg:grid-cols-[220px_1fr_220px]"><div><p className="font-semibold">{person.name}</p><p className="text-xs text-slate-500">{person.role}</p></div><label className="text-sm font-semibold">Endereço-base<input value={person.baseAddress ?? ""} onChange={(event) => update(person.id, { baseAddress: event.target.value })} placeholder="Rua, número, cidade - UF" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label><label className="text-sm font-semibold">Disponibilidade<select value={person.availability ?? "Integral"} onChange={(event) => update(person.id, { availability: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"><option>Integral</option><option>Manhã</option><option>Tarde</option><option>Plantão</option><option>Indisponível</option></select></label></article>)}{!people.length && <p className="py-8 text-sm text-slate-500">Cadastre um técnico antes de configurar a base de rota.</p>}</div></div></section></div></main>;
}
