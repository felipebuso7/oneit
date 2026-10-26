"use client";

import { FormEvent, useEffect, useState } from "react";
import { DemoSidebar } from "@/components/demo-sidebar";

type ProblemStatus = "Em investigação" | "Erro conhecido" | "Correção em andamento" | "Resolvido";
type QueueTicket = { id: string; subject: string; status: "Aberto" | "Pendente" | "SLA vencido" | "Fechado" };
type Problem = {
  id: string;
  title: string;
  category: string;
  impact: string;
  owner: string;
  linkedTickets: string;
  rootCause: string;
  workaround: string;
  status: ProblemStatus;
};

const storageKey = "oneit.demo.problems.v1";
const initialProblems: Problem[] = [{
  id: "PRB-0041",
  title: "Oscilação recorrente de Wi-Fi no centro de distribuição",
  category: "Redes",
  impact: "Operação logística e coletores móveis",
  owner: "Rafael Bonato",
  linkedTickets: "INC-0142, INC-0141",
  rootCause: "Em análise técnica.",
  workaround: "Utilizar rede contingencial até a normalização.",
  status: "Em investigação",
}];

const tone = (status: ProblemStatus) => status === "Resolvido" ? "bg-emerald-50 text-emerald-700" : status === "Erro conhecido" ? "bg-violet-50 text-violet-700" : status === "Correção em andamento" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-700";

export default function ProblemsDemoPage() {
  const [problems, setProblems] = useState<Problem[]>(initialProblems);
  const [queueTickets, setQueueTickets] = useState<QueueTicket[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState("Registre um problema quando incidentes recorrentes ou de causa desconhecida exigirem investigação estruturada.");

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "null") as Problem[] | null;
      if (Array.isArray(saved)) setProblems(saved);
      const savedTickets = JSON.parse(window.localStorage.getItem("oneit.demo.tickets.v1") ?? "{}") as { tickets?: QueueTicket[] };
      if (Array.isArray(savedTickets.tickets)) setQueueTickets(savedTickets.tickets.filter((ticket) => ticket.status !== "Fechado"));
    } catch {
      window.localStorage.removeItem(storageKey);
    } finally {
      setHydrated(true);
    }
  }, []);
  useEffect(() => { if (hydrated) window.localStorage.setItem(storageKey, JSON.stringify(problems)); }, [hydrated, problems]);

  const createProblem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    const owner = String(data.get("owner") ?? "").trim();
    const impact = String(data.get("impact") ?? "").trim();
    const workaround = String(data.get("workaround") ?? "").trim();
    if (!title || !owner || !impact || !workaround) return;
    const problem: Problem = {
      id: "PRB-" + String(Date.now()).slice(-6),
      title,
      category: String(data.get("category") ?? "Operação"),
      impact,
      owner,
      linkedTickets: data.getAll("linkedTickets").map(String).filter(Boolean).join(", "),
      rootCause: "Ainda não identificada.",
      workaround,
      status: "Em investigação",
    };
    setProblems((current) => [problem, ...current]);
    event.currentTarget.reset();
    setNotice("Problema registrado e encaminhado para investigação de causa raiz.");
  };
  const changeStatus = (id: string, status: ProblemStatus) => {
    setProblems((current) => current.map((problem) => problem.id === id ? { ...problem, status } : problem));
    setNotice("Status do problema atualizado para " + status + ".");
  };

  return <main className="min-h-screen bg-slate-100 text-slate-900">
    <DemoSidebar active="problems" />
    <div data-oneit-sidebar-offset className="ml-64 min-h-screen">
      <header className="flex min-h-[62px] items-center justify-between border-b border-slate-300 bg-white px-5">
        <div><p className="text-[11px] font-semibold tracking-[.15em] text-orange-500">ONEIT · ITIL PROBLEM MANAGEMENT</p><h1 className="mt-0.5 text-lg font-semibold">Gestão de problemas</h1></div>
        <span className="border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-800">Causa raiz e erro conhecido</span>
      </header>
      <section className="p-3 sm:p-4">
        <div className="oneit-operational-band border border-[#103c98] bg-[#123f99] px-4 py-3 text-white"><p className="text-xs font-semibold">Prevenção de recorrência</p><p className="mt-0.5 text-xs text-blue-100">Centralize investigação, causa raiz, workaround, erro conhecido, ações corretivas e chamados relacionados.</p></div>
        <p role="status" className="mt-3 border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-900">{notice}</p>
        <div className="mt-3 grid gap-3 xl:grid-cols-[390px_1fr]">
          <form onSubmit={createProblem} className="border bg-white p-4">
            <h2 className="font-semibold">Novo problema</h2><p className="mt-1 text-sm text-slate-500">Use para investigar incidentes recorrentes, impactos relevantes ou causa ainda desconhecida.</p>
            <div className="mt-4 grid gap-3"><input name="title" required placeholder="Título do problema" className="rounded-lg border p-2.5" /><select name="category" className="rounded-lg border p-2.5"><option>Redes</option><option>Hardware</option><option>Software</option><option>Acessos</option><option>Fornecedor</option><option>Operação</option></select><input name="owner" required placeholder="Responsável pela investigação" className="rounded-lg border p-2.5" /><label className="text-sm font-medium">Chamados relacionados<select name="linkedTickets" multiple size={Math.min(6, Math.max(3, queueTickets.length || 3))} className="mt-1 w-full rounded-lg border p-2.5 text-sm">{queueTickets.map((ticket) => <option key={ticket.id} value={ticket.id}>{ticket.id + " · " + ticket.subject + " (" + ticket.status + ")"}</option>)}</select><span className="mt-1 block text-xs font-normal text-slate-500">Selecione um ou mais chamados abertos, em atendimento, pendentes ou com SLA vencido.</span></label><textarea name="impact" required placeholder="Impacto para negócio e serviços" className="min-h-20 rounded-lg border p-2.5" /><textarea name="workaround" required placeholder="Workaround conhecido ou contingência" className="min-h-20 rounded-lg border p-2.5" /></div>
            <button className="oneit-grid-action mt-4 border border-[#123f99] bg-[#123f99] px-4 py-2 text-sm font-semibold text-white">Registrar investigação</button>
          </form>
          <section className="overflow-hidden border bg-white">
            <div className="border-b p-4"><h2 className="font-semibold">Investigações em curso</h2><p className="mt-1 text-sm text-slate-500">O erro conhecido preserva a solução temporária enquanto a correção definitiva é conduzida.</p></div>
            <div className="overflow-x-auto"><table className="oneit-operational-grid min-w-full text-left text-sm"><thead className="bg-[#f4f5f7] text-xs uppercase text-slate-500"><tr><th className="p-3">Problema</th><th className="p-3">Impacto e chamados</th><th className="p-3">Causa / workaround</th><th className="p-3">Status</th></tr></thead><tbody>{problems.map((problem) => <tr key={problem.id} className="border-t align-top hover:bg-[#eef4ff]"><td className="p-3"><p className="font-semibold text-[#123f99]">{problem.id}</p><p>{problem.title}</p><p className="mt-1 text-xs text-slate-500">{problem.category} · {problem.owner}</p></td><td className="p-3"><p>{problem.impact}</p><p className="mt-1 text-xs text-slate-500">Chamados: {problem.linkedTickets || "Não informados"}</p></td><td className="p-3"><p><span className="font-medium">Causa:</span> {problem.rootCause}</p><p className="mt-1 text-xs text-slate-500"><span className="font-medium">Contingência:</span> {problem.workaround}</p></td><td className="p-3"><span className={"rounded-full px-2 py-1 text-xs font-semibold " + tone(problem.status)}>{problem.status}</span><div className="mt-2 flex flex-wrap gap-2">{problem.status === "Em investigação" && <button type="button" onClick={() => changeStatus(problem.id, "Erro conhecido")} className="oneit-grid-action border border-violet-300 px-2 py-1 text-xs font-semibold text-violet-800">Publicar erro conhecido</button>}{problem.status === "Erro conhecido" && <button type="button" onClick={() => changeStatus(problem.id, "Correção em andamento")} className="oneit-grid-action border border-amber-300 px-2 py-1 text-xs font-semibold text-amber-800">Iniciar correção</button>}{problem.status === "Correção em andamento" && <button type="button" onClick={() => changeStatus(problem.id, "Resolvido")} className="oneit-grid-action border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-800">Encerrar problema</button>}</div></td></tr>)}</tbody></table></div>
          </section>
        </div>
      </section>
    </div>
  </main>;
}
