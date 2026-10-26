"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DemoSidebar } from "@/components/demo-sidebar";

type Priority = "Crítica" | "Alta" | "Média";
type TaskStatus = "Planejada" | "Em execução" | "Aguardando evidência" | "Em validação" | "Concluída" | "Eficácia verificada" | "Impedida";
type Task = { id: string; code: string; title: string; acceptance: string; expectedEvidence: string; status: TaskStatus; owner: string; dueAt: string; evidence?: string; execution?: string; action?: string; actionKind?: string; blocker?: string; riteActionId?: string };
type Initiative = { id: string; code: string; title: string; priority: Priority; iso: string; owner: string; dueAt: string; tasks: Task[] };

const storageKey = "oneit.demo.sgsti.master-plan.v1";
const today = new Date().toISOString().slice(0, 10);
const seeds: Initiative[] = [
  { id: "mel-02", code: "MEL-02", title: "Integridade do SLA e status Pendente", priority: "Crítica", iso: "8.3.3 · 8.6.1 · 9.1", owner: "Coordenação TI", dueAt: "2026-11-14", tasks: [
    { id: "mel-02-01", code: "MEL-02.01", title: "Inventariar regras de início, pausa e fim do relógio", acceptance: "Mapa das regras parametrizado, datado e validado pelo dono do processo.", expectedEvidence: "Mapa parametrizado das regras e referência de configuração.", status: "Em execução", owner: "Coordenação TI", dueAt: "2026-10-28" },
    { id: "mel-02-02", code: "MEL-02.02", title: "Revisar amostra de pendências sem justificativa", acceptance: "Amostra identificada, com desvios e responsável pela tratativa.", expectedEvidence: "Lista de chamados e resultado da análise.", status: "Aguardando evidência", owner: "Qualidade", dueAt: "2026-10-30" },
    { id: "mel-02-03", code: "MEL-02.03", title: "Definir hipóteses justificáveis de suspensão", acceptance: "Regras aprovadas e vinculadas ao acordo de serviço aplicável.", expectedEvidence: "Matriz de estados e responsabilidades aprovada.", status: "Planejada", owner: "Coordenação TI", dueAt: "2026-11-03" },
  ] },
  { id: "mel-03", code: "MEL-03", title: "Gerenciamento de Problemas", priority: "Alta", iso: "8.6.3", owner: "Coordenação TI", dueAt: "2026-11-21", tasks: [
    { id: "mel-03-01", code: "MEL-03.01", title: "Identificar incidentes repetitivos e causas não resolvidas", acceptance: "Lista de candidatos a problema revisada e priorizada.", expectedEvidence: "Consulta de incidentes relacionados e lista de candidatos.", status: "Concluída", owner: "Analista de serviços", dueAt: "2026-10-22", evidence: "REL-INC-2026-10 — recorrência de incidentes", execution: "A amostra de incidentes recorrentes foi analisada e os candidatos foram registrados." },
    { id: "mel-03-02", code: "MEL-03.02", title: "Definir gatilhos de abertura e classificação de problema", acceptance: "Critérios formalizados, comunicados e disponíveis para consulta.", expectedEvidence: "Procedimento ou matriz de gatilhos aprovada.", status: "Planejada", owner: "Coordenação TI", dueAt: "2026-11-05" },
  ] },
  { id: "mel-24", code: "MEL-24", title: "Controle documental e versões", priority: "Crítica", iso: "7.5", owner: "Qualidade", dueAt: "2026-11-28", tasks: [
    { id: "mel-24-01", code: "MEL-24.01", title: "Inventariar documentos do SGSTI e seus responsáveis", acceptance: "Inventário possui status, versão, aprovação, proprietário e revisão programada.", expectedEvidence: "Inventário documental controlado.", status: "Impedida", owner: "Qualidade", dueAt: "2026-10-24", blocker: "A área responsável ainda não consolidou os documentos vigentes no Drive." },
    { id: "mel-24-02", code: "MEL-24.02", title: "Definir ciclo de revisão, aprovação e obsolescência", acceptance: "Fluxo publicado e aplicado em documento de teste.", expectedEvidence: "Procedimento aprovado e registro de teste.", status: "Planejada", owner: "Qualidade", dueAt: "2026-11-07" },
  ] },
];

const tone: Record<TaskStatus, string> = { Planejada: "bg-slate-100 text-slate-700", "Em execução": "bg-blue-50 text-blue-700", "Aguardando evidência": "bg-amber-50 text-amber-700", "Em validação": "bg-violet-50 text-violet-700", Concluída: "bg-emerald-50 text-emerald-700", "Eficácia verificada": "bg-teal-50 text-teal-700", Impedida: "bg-red-50 text-red-700" };
const taskStatuses: TaskStatus[] = ["Planejada", "Em execução", "Aguardando evidência", "Em validação", "Concluída", "Eficácia verificada", "Impedida"];

type RiteActionImport = { id: string; sourceTitle: string; title: string; kind: string; owner: string; dueAt: string; acceptance: string; expectedEvidence: string; status: "Planejada" | "Em execução" | "Aguardando evidência" | "Em validação" | "Concluída" };
function includeRiteActions(plan: Initiative[]): Initiative[] {
  try {
    const actions = JSON.parse(localStorage.getItem("oneit.demo.sgsti.rite-actions.v1") ?? "[]") as RiteActionImport[];
    if (!Array.isArray(actions) || !actions.length) return plan;
    const existing = new Set(plan.flatMap((initiative) => initiative.tasks.map((task) => task.riteActionId)).filter(Boolean));
    const additions = actions.filter((action) => !existing.has(action.id));
    if (!additions.length) return plan;
    const initiative = plan.find((item) => item.id === "ritos-decisao") ?? { id: "ritos-decisao", code: "RIT-01", title: "Decisões e ações de ritos", priority: "Média" as Priority, iso: "9.3 · 10.2", owner: "Governança de TI", dueAt: additions.reduce((date, action) => !date || action.dueAt < date ? action.dueAt : date, ""), tasks: [] as Task[] };
    const tasks = additions.map((action, index) => ({ id: `rit-${action.id}`, riteActionId: action.id, code: `RIT-01.${String(initiative.tasks.length + index + 1).padStart(2, "0")}`, title: action.title, acceptance: action.acceptance, expectedEvidence: action.expectedEvidence, status: action.status, owner: action.owner, dueAt: action.dueAt, action: action.title, actionKind: action.kind }));
    return plan.some((item) => item.id === initiative.id) ? plan.map((item) => item.id === initiative.id ? { ...item, tasks: [...item.tasks, ...tasks], dueAt: item.dueAt || initiative.dueAt } : item) : [...plan, { ...initiative, tasks }];
  } catch { return plan; }
}

function isLate(task: Task) { return !["Concluída", "Eficácia verificada"].includes(task.status) && task.dueAt < today; }

export default function SgstiActionPlanPage() {
  const [initiatives, setInitiatives] = useState<Initiative[]>(seeds);
  const [hydrated, setHydrated] = useState(false);
  const [selectedId, setSelectedId] = useState(seeds[0].id);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [showExecution, setShowExecution] = useState(false);
  const [showAction, setShowAction] = useState(false);
  const [notice, setNotice] = useState("Escolha uma iniciativa, avance as tarefas e vincule evidências verificáveis.");

  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null"); const base = Array.isArray(saved) ? saved : seeds; setInitiatives(includeRiteActions(base)); } catch { setInitiatives(includeRiteActions(seeds)); } finally { setHydrated(true); } }, []);
  useEffect(() => { if (hydrated) localStorage.setItem(storageKey, JSON.stringify(initiatives)); }, [initiatives, hydrated]);

  const selected = initiatives.find((item) => item.id === selectedId) ?? initiatives[0];
  const selectedTask = selected?.tasks.find((task) => task.id === selectedTaskId) ?? selected?.tasks[0];
  const allTasks = initiatives.flatMap((item) => item.tasks);
  const metrics = useMemo(() => [
    ["Iniciativas", initiatives.length, "text-slate-900"],
    ["Tarefas em execução", allTasks.filter((task) => task.status === "Em execução" || task.status === "Aguardando evidência" || task.status === "Em validação").length, "text-blue-700"],
    ["Pendências em atraso", allTasks.filter(isLate).length, "text-red-700"],
    ["Eficácia verificada", allTasks.filter((task) => task.status === "Eficácia verificada").length, "text-teal-700"],
  ] as const, [initiatives]);

  function updateTask(taskId: string, update: Partial<Task>) {
    setInitiatives((all) => all.map((initiative) => ({ ...initiative, tasks: initiative.tasks.map((task) => task.id === taskId ? { ...task, ...update } : task) })));
  }

  function saveExecution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTask) return;
    const data = new FormData(event.currentTarget);
    const status = String(data.get("status")) as TaskStatus;
    const execution = String(data.get("execution") ?? "").trim();
    const evidence = String(data.get("evidence") ?? "").trim();
    const blocker = String(data.get("blocker") ?? "").trim();
    if (["Em validação", "Concluída", "Eficácia verificada"].includes(status) && !evidence) { setNotice("Para enviar à validação ou concluir, vincule uma evidência rastreável."); return; }
    if (["Concluída", "Eficácia verificada"].includes(status) && execution.length < 10) { setNotice("Descreva o que foi realizado antes de concluir a tarefa."); return; }
    if (status === "Impedida" && blocker.length < 10) { setNotice("Registre o motivo do impedimento e o próximo passo."); return; }
    updateTask(selectedTask.id, { status, execution, evidence, blocker });
    setShowExecution(false);
    setNotice(status === "Eficácia verificada" ? "Eficácia validada e registrada no histórico da tarefa." : "Execução atualizada. A evidência ficará disponível na trilha de auditoria.");
  }

  function createAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTask) return;
    const data = new FormData(event.currentTarget);
    const description = String(data.get("description") ?? "").trim();
    if (description.length < 10) { setNotice("Descreva a ação com clareza antes de registrá-la."); return; }
    updateTask(selectedTask.id, { action: description, actionKind: String(data.get("kind")), status: selectedTask.status === "Planejada" ? "Em execução" : selectedTask.status });
    setShowAction(false);
    setNotice("Plano de ação criado e vinculado à tarefa. Na implantação com banco, ele será gravado no registro central de planos de ação.");
  }

  return <main className="min-h-screen bg-[#f5f6f8] text-slate-900"><DemoSidebar active="sgsti-action-plan" /><div data-oneit-sidebar-offset className="ml-64 min-h-screen">
    <header className="flex min-h-[62px] flex-wrap items-center justify-between gap-3 border-b border-slate-300 bg-white px-5 py-2"><div><p className="text-[11px] font-semibold tracking-[.15em] text-orange-500">ONEIT · SGSTI</p><h1 className="mt-0.5 text-lg font-semibold">Plano Mestre e ações</h1></div><a href="/demo/sgsti" className="oneit-grid-action border border-slate-300 px-3 py-1.5 text-xs font-semibold">Voltar à agenda</a></header>
    <section className="p-3 sm:p-4"><div className="oneit-operational-band border border-[#103c98] bg-[#123f99] px-4 py-3 text-white"><p className="text-xs font-semibold">Controle de melhorias</p><p className="mt-0.5 text-xs text-blue-100">Cada tarefa tem critério de aceite, responsável, prazo, ação vinculada e registro verificável para auditoria.</p></div><p role="status" className="mt-3 border border-cyan-200 bg-cyan-50 p-3 text-sm">{notice}</p>
      <div className="mt-3 grid gap-px border border-slate-300 bg-slate-300 md:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value, color]) => <div key={label} className="bg-white px-3 py-2.5"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p><strong className={"mt-1 block text-xl " + color}>{value}</strong></div>)}</div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]"><aside className="h-fit overflow-hidden rounded-xl border bg-white"><header className="border-b p-5"><h2 className="font-semibold">Iniciativas</h2><p className="mt-1 text-sm text-slate-500">Plano Mestre SGSTI</p></header><div className="divide-y">{initiatives.map((initiative) => { const done = initiative.tasks.filter((task) => ["Concluída", "Eficácia verificada"].includes(task.status)).length; return <button key={initiative.id} onClick={() => { setSelectedId(initiative.id); setSelectedTaskId(initiative.tasks[0]?.id ?? ""); }} className={"w-full p-4 text-left hover:bg-slate-50 " + (initiative.id === selected?.id ? "bg-orange-50" : "")}><div className="flex items-start justify-between gap-2"><div><p className="text-xs font-bold tracking-wide text-orange-600">{initiative.code}</p><p className="mt-1 text-sm font-semibold">{initiative.title}</p></div><span className={"rounded-full px-2 py-1 text-[11px] font-semibold " + (initiative.priority === "Crítica" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700")}>{initiative.priority}</span></div><p className="mt-2 text-xs text-slate-500">{done}/{initiative.tasks.length} tarefas concluídas · {initiative.owner}</p></button>; })}</div></aside>
        <section className="overflow-hidden rounded-xl border bg-white"><header className="border-b p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold tracking-[.12em] text-orange-500">{selected?.code}</p><h2 className="mt-1 text-lg font-semibold">{selected?.title}</h2><p className="mt-1 text-sm text-slate-500">ISO/IEC 20000-1: {selected?.iso} · Responsável: {selected?.owner} · Prazo: {selected && new Date(selected.dueAt + "T00:00:00").toLocaleDateString("pt-BR")}</p></div><span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold">{selected?.tasks.length} tarefas</span></div></header>
          <div className="overflow-x-auto"><table className="min-w-[880px] w-full text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Tarefa</th><th className="px-5 py-3">Responsável</th><th className="px-5 py-3">Prazo</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Ação</th></tr></thead><tbody className="divide-y">{selected?.tasks.map((task) => <tr key={task.id} className={selectedTask?.id === task.id ? "bg-orange-50/50" : "hover:bg-slate-50"}><td className="px-5 py-4"><button onClick={() => setSelectedTaskId(task.id)} className="text-left"><strong>{task.code} · {task.title}</strong><span className="mt-1 block text-xs text-slate-500">Evidência esperada: {task.expectedEvidence}</span></button></td><td className="px-5 py-4">{task.owner}</td><td className={"px-5 py-4 " + (isLate(task) ? "font-semibold text-red-700" : "")}>{new Date(task.dueAt + "T00:00:00").toLocaleDateString("pt-BR")}</td><td className="px-5 py-4"><span className={"whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold " + tone[task.status]}>{isLate(task) ? "Atrasada" : task.status}</span></td><td className="px-5 py-4">{task.action ? <span className="text-xs font-medium text-blue-700">{task.actionKind}</span> : <button onClick={() => { setSelectedTaskId(task.id); setShowAction(true); }} className="rounded border px-2 py-1 text-xs font-semibold">Criar ação</button>}</td></tr>)}</tbody></table></div>
          {selectedTask && <div className="border-t bg-slate-50 p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold tracking-[.12em] text-orange-500">DETALHE DA TAREFA</p><h3 className="mt-1 font-semibold">{selectedTask.code} · {selectedTask.title}</h3><p className="mt-2 text-sm"><span className="font-semibold">Aceite:</span> {selectedTask.acceptance}</p>{selectedTask.evidence && <p className="mt-1 text-sm"><span className="font-semibold">Evidência:</span> {selectedTask.evidence}</p>}{selectedTask.execution && <p className="mt-1 text-sm"><span className="font-semibold">Executado:</span> {selectedTask.execution}</p>}{selectedTask.blocker && <p className="mt-1 text-sm text-red-700"><span className="font-semibold">Impedimento:</span> {selectedTask.blocker}</p>}</div><div className="flex gap-2"><button onClick={() => setShowExecution(true)} className="rounded-lg bg-[#092f40] px-3 py-2 text-sm font-semibold text-white">Registrar execução</button>{!selectedTask.action && <button onClick={() => setShowAction(true)} className="rounded-lg border px-3 py-2 text-sm font-semibold">Plano de ação</button>}</div></div></div>}
        </section></div></section></div>
    {showExecution && selectedTask && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4"><form onSubmit={saveExecution} role="dialog" aria-modal="true" className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl"><header className="flex items-start justify-between border-b p-6"><div><p className="text-xs font-semibold tracking-[.14em] text-orange-500">REGISTRO DE EXECUÇÃO</p><h2 className="mt-1 text-xl font-semibold">{selectedTask.code} · {selectedTask.title}</h2></div><button type="button" onClick={() => setShowExecution(false)} aria-label="Fechar" className="text-xl text-slate-500">×</button></header><div className="grid gap-4 p-6"><label className="text-sm font-semibold">Status<select name="status" defaultValue={selectedTask.status} className="mt-1 w-full rounded-lg border p-2.5 font-normal">{taskStatuses.map((status) => <option key={status}>{status}</option>)}</select></label><label className="text-sm font-semibold">O que foi realizado<textarea name="execution" defaultValue={selectedTask.execution} rows={4} className="mt-1 w-full rounded-lg border p-2.5 font-normal" placeholder="Descreva a execução, criação ou alteração realizada." /></label><label className="text-sm font-semibold">Evidência rastreável<textarea name="evidence" defaultValue={selectedTask.evidence} rows={2} className="mt-1 w-full rounded-lg border p-2.5 font-normal" placeholder="Ex.: CHG-0124, link do Drive, relatório, documento ou dashboard." /></label><label className="text-sm font-semibold">Impedimento e próximo passo<textarea name="blocker" defaultValue={selectedTask.blocker} rows={2} className="mt-1 w-full rounded-lg border p-2.5 font-normal" placeholder="Obrigatório se a tarefa estiver impedida." /></label></div><footer className="flex justify-end gap-3 border-t p-5"><button type="button" onClick={() => setShowExecution(false)} className="rounded-lg border px-4 py-2 text-sm font-semibold">Cancelar</button><button className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white">Salvar registro</button></footer></form></div>}
    {showAction && selectedTask && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4"><form onSubmit={createAction} role="dialog" aria-modal="true" className="w-full max-w-xl rounded-2xl bg-white shadow-2xl"><header className="flex items-start justify-between border-b p-6"><div><p className="text-xs font-semibold tracking-[.14em] text-orange-500">PLANO DE AÇÃO</p><h2 className="mt-1 text-xl font-semibold">Vincular à {selectedTask.code}</h2><p className="mt-1 text-sm text-slate-500">A ação será acompanhada sem perder a origem na iniciativa do SGSTI.</p></div><button type="button" onClick={() => setShowAction(false)} aria-label="Fechar" className="text-xl text-slate-500">×</button></header><div className="grid gap-4 p-6"><label className="text-sm font-semibold">Tipo<select name="kind" className="mt-1 w-full rounded-lg border p-2.5 font-normal"><option>Correção</option><option>Ação corretiva</option><option>Melhoria</option><option>Ação preventiva</option><option>Tratamento de risco</option></select></label><label className="text-sm font-semibold">Ação, responsável e resultado esperado<textarea name="description" required rows={4} className="mt-1 w-full rounded-lg border p-2.5 font-normal" placeholder="Ex.: Revisar a regra de suspensão de SLA, publicar procedimento e testar em amostra." /></label></div><footer className="flex justify-end gap-3 border-t p-5"><button type="button" onClick={() => setShowAction(false)} className="rounded-lg border px-4 py-2 text-sm font-semibold">Cancelar</button><button className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white">Criar e vincular</button></footer></form></div>}
  </main>;
}
