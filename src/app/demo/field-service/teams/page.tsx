"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DemoSidebar } from "@/components/demo-sidebar";

type Technician = { id: string; name: string; team: string; kind: "Interno" | "Parceiro"; phone: string; coverage: string; partnerTicket?: string; active: boolean };
const key = "oneit.demo.field-technicians.v1";
const seed: Technician[] = [
  { id: "tech-1", name: "Felipe Buso", team: "Equipe interna SP", kind: "Interno", phone: "(11) 99999-1001", coverage: "São Paulo e Grande SP", active: true },
  { id: "tech-2", name: "Ana Costa", team: "Equipe interna Sul", kind: "Interno", phone: "(11) 99999-1002", coverage: "Litoral e Vale do Ribeira", active: true },
  { id: "tech-3", name: "Carlos Ribeiro", team: "Parceiro Norte", kind: "Parceiro", phone: "(11) 98888-2001", coverage: "Zona Norte e Interior", partnerTicket: "OS-PARCEIRO-001", active: true },
];

export default function FieldTechniciansSettingsPage() {
  const [technicians, setTechnicians] = useState<Technician[]>(() => {
    if (typeof window === "undefined") return seed;
    try { const saved = JSON.parse(window.localStorage.getItem(key) ?? "null"); return Array.isArray(saved) ? saved : seed; } catch { return seed; }
  });
  const [notice, setNotice] = useState("Cadastre as equipes antes de despachar as ordens de campo.");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const organizationId = localStorage.getItem("oneit.demo.organization-id.v1");
    if (!organizationId) return;
    fetch(`/api/field-service/technicians?organizationId=${encodeURIComponent(organizationId)}`).then(async (response) => response.ok ? response.json() : null).then((payload: { technicians?: Array<{ id: string; name: string; email: string; mobile: string | null; technician_type?: "internal" | "partner"; active: boolean }> } | null) => {
      if (!payload?.technicians?.length) return;
      setTechnicians(payload.technicians.map((item) => ({ id: item.id, name: item.name, team: item.technician_type === "partner" ? "Parceiro" : "Cadastro persistente", kind: item.technician_type === "partner" ? "Parceiro" : "Interno", phone: item.mobile ?? "", coverage: "A definir", active: item.active })));
      setNotice("Diretório carregado do cadastro persistente.");
    }).catch(() => undefined);
  }, []);
  useEffect(() => { localStorage.setItem(key, JSON.stringify(technicians)); }, [technicians]);
  const visible = useMemo(() => technicians.filter((item) => [item.name, item.team, item.coverage, item.kind].join(" ").toLocaleLowerCase().includes(query.toLocaleLowerCase())), [technicians, query]);
  function addTechnician(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const team = String(data.get("team") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const coverage = String(data.get("coverage") ?? "").trim();
    const kind = String(data.get("kind") ?? "Interno") as Technician["kind"];
    const partnerTicket = String(data.get("partnerTicket") ?? "").trim();
    if (!name || !team || !phone || !coverage) { setNotice("Informe nome, equipe, telefone e cobertura para disponibilizar o técnico no despacho."); return; }
    setTechnicians((all) => [...all, { id: "tech-" + Date.now(), name, team, kind, phone, coverage, partnerTicket, active: true }]);
    event.currentTarget.reset();
    setNotice("Técnico cadastrado e disponível na Central de Field Service.");
  }
  return <main className="min-h-screen bg-slate-100 text-slate-900"><DemoSidebar active="settings" /><div data-oneit-sidebar-offset className="ml-64 min-h-screen"><header className="flex items-center justify-between border-b bg-white px-8 py-4"><div><p className="text-xs font-semibold tracking-[.15em] text-orange-500">ONEIT · CONFIGURAÇÕES · FIELD SERVICE</p><h1 className="mt-1 text-xl font-semibold">Equipes e técnicos</h1></div><a href="/demo/field-service" className="rounded-lg border px-4 py-2 text-sm font-semibold">Voltar ao despacho</a></header><section className="p-8"><div className="rounded-xl bg-[#092f40] p-6 text-white"><p className="text-xs font-semibold tracking-[.15em] text-orange-300">CAPACIDADE DE CAMPO</p><h2 className="mt-2 text-2xl font-semibold">Técnicos Servicia e parceiros</h2><p className="mt-1 text-sm text-slate-300">Mantenha equipe, contato, cobertura e referência operacional do parceiro para despachar com rastreabilidade.</p></div><p role="status" className="mt-5 rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm">{notice}</p><div className="mt-5 grid gap-5 xl:grid-cols-[370px_1fr]"><form onSubmit={addTechnician} className="rounded-xl border bg-white p-5"><h2 className="font-semibold">Novo técnico ou parceiro</h2><div className="mt-4 grid gap-3"><input name="name" required placeholder="Nome completo" className="rounded-lg border p-2.5" /><select name="kind" className="rounded-lg border p-2.5"><option value="Interno">Técnico Servicia</option><option value="Parceiro">Técnico parceiro</option></select><input name="team" required placeholder="Equipe, ex.: Parceiro Litoral" className="rounded-lg border p-2.5" /><input name="phone" required placeholder="Telefone de contato" className="rounded-lg border p-2.5" /><input name="coverage" required placeholder="Região ou cobertura" className="rounded-lg border p-2.5" /><input name="partnerTicket" placeholder="Referência/OS padrão do parceiro" className="rounded-lg border p-2.5" /></div><button className="mt-4 rounded-lg bg-[#092f40] px-4 py-2 text-sm font-semibold text-white">Salvar técnico</button></form><section className="overflow-hidden rounded-xl border bg-white"><div className="flex items-center gap-3 border-b p-5"><div><h2 className="font-semibold">Diretório operacional</h2><p className="mt-1 text-sm text-slate-500">Apenas técnicos ativos serão exibidos para o gestor no despacho.</p></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar técnico, equipe ou região" className="ml-auto rounded-lg border px-3 py-2 text-sm" /></div><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Técnico</th><th className="p-4">Equipe / modelo</th><th className="p-4">Cobertura</th><th className="p-4">Contato</th><th className="p-4">Status</th></tr></thead><tbody>{visible.map((item) => <tr key={item.id} className="border-t"><td className="p-4 font-semibold">{item.name}</td><td className="p-4">{item.team}<small className="block text-slate-500">{item.kind === "Interno" ? "Técnico Servicia" : "Técnico parceiro"}</small></td><td className="p-4">{item.coverage}</td><td className="p-4">{item.phone}{item.partnerTicket && <small className="block text-slate-500">Ref.: {item.partnerTicket}</small>}</td><td className="p-4"><button type="button" onClick={() => setTechnicians((all) => all.map((value) => value.id === item.id ? { ...value, active: !value.active } : value))} className={item.active ? "rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700" : "rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600"}>{item.active ? "Ativo" : "Inativo"}</button></td></tr>)}</tbody></table></section></div></section></div></main>;
}

