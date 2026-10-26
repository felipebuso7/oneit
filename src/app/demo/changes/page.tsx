"use client";

import { FormEvent, useEffect, useState } from "react";
import { DemoSidebar } from "@/components/demo-sidebar";

type ChangeStatus = "Em avaliação" | "Aguardando aprovação" | "Aprovada" | "Implementada" | "Rejeitada";
type Change = { id: string; title: string; type: "Normal" | "Padrão" | "Emergencial"; risk: "Baixo" | "Médio" | "Alto"; owner: string; scheduledAt: string; impact: string; rollback: string; status: ChangeStatus; };
const initialChanges: Change[] = [{ id: "CHG-0102", title: "Atualização programada do agente de inventário", type: "Normal", risk: "Médio", owner: "Felipe Buso", scheduledAt: "2026-10-18 22:00", impact: "Estações corporativas", rollback: "Reverter pacote para versão anterior", status: "Aguardando aprovação" }];
const storageKey = "oneit.demo.changes.v1";
const statusTone = (status: ChangeStatus) => status === "Aprovada" || status === "Implementada" ? "bg-emerald-50 text-emerald-700" : status === "Rejeitada" ? "bg-red-50 text-red-700" : status === "Aguardando aprovação" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-700";

export default function ChangesDemoPage() {
  const [changes, setChanges] = useState<Change[]>(initialChanges);
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState("Mudanças normais exigem avaliação de risco, plano de retorno e aprovação.");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "null") as Change[] | null;
        if (Array.isArray(saved)) setChanges(saved);
      } catch {
        window.localStorage.removeItem(storageKey);
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { if (hydrated) window.localStorage.setItem(storageKey, JSON.stringify(changes)); }, [changes, hydrated]);
  const createChange = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    const impact = String(data.get("impact") ?? "").trim();
    const rollback = String(data.get("rollback") ?? "").trim();
    if (!title || !impact || !rollback) return;
    const type = String(data.get("type") ?? "Normal") as Change["type"];
    const change: Change = { id: "CHG-" + String(Date.now()).slice(-6), title, type, risk: String(data.get("risk") ?? "Médio") as Change["risk"], owner: String(data.get("owner") ?? "").trim(), scheduledAt: String(data.get("scheduledAt") ?? "").replace("T", " "), impact, rollback, status: type === "Padrão" ? "Aprovada" : "Aguardando aprovação" };
    setChanges((current) => [change, ...current]);
    event.currentTarget.reset();
    setNotice(change.status === "Aprovada" ? "Mudança padrão registrada como pré-aprovada." : "Mudança registrada e enviada para aprovação.");
  };
  const updateStatus = (id: string, status: ChangeStatus) => { setChanges((current) => current.map((change) => change.id === id ? { ...change, status } : change)); setNotice("Status da mudança atualizado para " + status + "."); };
  return <main className="min-h-screen bg-slate-100 text-slate-900"><DemoSidebar active="changes" /><div data-oneit-sidebar-offset className="ml-64 min-h-screen"><header className="flex items-center justify-between border-b bg-white px-8 py-4"><div><p className="text-xs font-semibold tracking-[.15em] text-orange-500">ONEIT · ITIL CHANGE ENABLEMENT</p><h1 className="mt-1 text-xl font-semibold">Gestão de mudanças</h1></div><span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-800">CAB e governança</span></header><section className="p-8"><div className="rounded-xl bg-[#092f40] p-6 text-white"><p className="text-xs font-semibold tracking-[.15em] text-orange-300">MUDANÇAS CONTROLADAS</p><h2 className="mt-2 text-2xl font-semibold">Avalie, aprove, implemente e aprenda</h2><p className="mt-1 text-sm text-slate-300">Todo registro preserva risco, impacto, plano de retorno, responsável e decisão.</p></div><p role="status" className="mt-5 rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">{notice}</p><div className="mt-5 grid gap-5 xl:grid-cols-[390px_1fr]"><form onSubmit={createChange} className="rounded-xl border bg-white p-5"><h2 className="font-semibold">Nova mudança</h2><div className="mt-4 grid gap-3"><input name="title" required placeholder="Título da mudança" className="rounded-lg border p-2.5" /><select name="type" className="rounded-lg border p-2.5"><option>Normal</option><option>Padrão</option><option>Emergencial</option></select><select name="risk" className="rounded-lg border p-2.5"><option>Baixo</option><option>Médio</option><option>Alto</option></select><input name="owner" required placeholder="Responsável" className="rounded-lg border p-2.5" /><input name="scheduledAt" type="datetime-local" required className="rounded-lg border p-2.5" /><textarea name="impact" required placeholder="Impacto e serviços afetados" className="min-h-20 rounded-lg border p-2.5" /><textarea name="rollback" required placeholder="Plano de retorno" className="min-h-20 rounded-lg border p-2.5" /></div><button className="mt-4 rounded-lg bg-[#092f40] px-4 py-2 text-sm font-semibold text-white">Registrar mudança</button></form><section className="overflow-hidden rounded-xl border bg-white"><div className="border-b p-5"><h2 className="font-semibold">Agenda e aprovações</h2><p className="mt-1 text-sm text-slate-500">Aprovação formal e evidências serão persistidas no banco da VPS na próxima etapa.</p></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Mudança</th><th className="p-4">Risco / janela</th><th className="p-4">Impacto e retorno</th><th className="p-4">Status</th></tr></thead><tbody>{changes.map((change) => <tr key={change.id} className="border-t align-top"><td className="p-4"><p className="font-semibold text-[#0b4a64]">{change.id}</p><p>{change.title}</p><p className="mt-1 text-xs text-slate-500">{change.type} · {change.owner}</p></td><td className="p-4">{change.risk}<p className="mt-1 text-xs text-slate-500">{change.scheduledAt}</p></td><td className="p-4"><p>{change.impact}</p><p className="mt-1 text-xs text-slate-500">Retorno: {change.rollback}</p></td><td className="p-4"><span className={"rounded-full px-2 py-1 text-xs font-semibold " + statusTone(change.status)}>{change.status}</span><div className="mt-2 flex flex-wrap gap-2">{change.status === "Aguardando aprovação" && <button type="button" onClick={() => updateStatus(change.id, "Aprovada")} className="rounded border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-800">Aprovar</button>}{change.status === "Aprovada" && <button type="button" onClick={() => updateStatus(change.id, "Implementada")} className="rounded border border-cyan-300 px-2 py-1 text-xs font-semibold text-cyan-800">Concluir</button>}</div></td></tr>)}</tbody></table></div></section></div></section></div></main>;
}
