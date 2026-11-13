import { OneitPageHeader } from "@/components/oneit";
import { requireUser } from "@/lib/auth/current-user";
import { createActionPlan, updateActionPlanStatus } from "./actions";

type Props = { searchParams: Promise<{ message?: string }> };

export default async function ActionPlansPage({ searchParams }: Props) {
  const [{ supabase, user }, { message }] = await Promise.all([requireUser(), searchParams]);
  const { data: roles } = await supabase.from("user_roles").select("organization_id").eq("user_id", user.id).in("role", ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER", "DISPATCHER"]);
  const organizationIds = [...new Set((roles ?? []).map((role) => role.organization_id))];
  const [{ data: problems }, { data: actions }] = await Promise.all([
    organizationIds.length ? supabase.from("problems").select("id,problem_number,title").in("organization_id", organizationIds) : Promise.resolve({ data: [] }),
    organizationIds.length ? supabase.from("action_plans").select("id,action_number,description,priority,status,due_at").in("organization_id", organizationIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
  ]);
  return <section className="oneit-page-shell mx-auto max-w-6xl p-5 sm:p-8">
    <OneitPageHeader eyebrow="Melhoria contínua" title="Planos de ação" description="Transforme problemas em ações rastreáveis, com prazo e verificação de eficácia." />
    {message ? <p role="status" className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">{message}</p> : null}
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <form action={createActionPlan} className="oneit-card grid content-start gap-4 p-5"><div><h2 className="font-semibold text-slate-900">Nova ação</h2><p className="mt-1 text-sm text-slate-500">Registre a resposta para um problema identificado.</p></div>
        <label className="grid gap-1 text-sm font-medium text-slate-700">Problema de origem<select name="problemId" required defaultValue="" className="rounded-lg border border-slate-300 bg-white p-2.5 font-normal"><option disabled value="">Selecione o problema</option>{(problems ?? []).map((problem) => <option key={problem.id} value={problem.id}>{problem.problem_number} — {problem.title}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">Prioridade<input name="priority" type="number" min="1" max="5" required placeholder="1 a 5" className="rounded-lg border border-slate-300 p-2.5 font-normal" /></label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">Prazo<input name="dueAt" type="datetime-local" className="rounded-lg border border-slate-300 p-2.5 font-normal" /></label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">Descrição da ação<textarea name="description" required className="min-h-28 rounded-lg border border-slate-300 p-2.5 font-normal" placeholder="Descreva a ação corretiva ou preventiva" /></label>
        <button className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-900">Criar ação</button>
      </form>
      <div className="oneit-card overflow-hidden"><div className="border-b border-slate-200 p-5"><h2 className="font-semibold text-slate-900">Ações registradas</h2><p className="mt-1 text-sm text-slate-500">Acompanhe status, prazo e resultado no mesmo contexto.</p></div>
        {!actions?.length ? <p className="p-8 text-center text-sm text-slate-500">Nenhuma ação registrada para suas organizações.</p> : <ul className="divide-y divide-slate-200">{actions.map((action) => <li key={action.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{action.action_number}</p><p className="mt-1 text-sm text-slate-700">{action.description}</p></div><span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800">P{action.priority} · {action.status}</span></div>{action.due_at ? <p className="mt-2 text-xs text-slate-500">Prazo: {new Date(action.due_at).toLocaleString("pt-BR")}</p> : null}<form action={updateActionPlanStatus} className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-2"><input type="hidden" name="actionId" value={action.id} /><label className="grid gap-1 text-xs font-semibold text-slate-600">Status<select name="status" defaultValue={action.status} className="rounded-lg border border-slate-300 bg-white p-2 text-sm font-normal"><option value="PLANNED">Planejada</option><option value="IN_PROGRESS">Em execução</option><option value="COMPLETED">Concluída</option><option value="EFFECTIVENESS_VERIFIED">Eficácia verificada</option></select></label><label className="grid gap-1 text-xs font-semibold text-slate-600">Resultado<textarea name="result" className="rounded-lg border border-slate-300 bg-white p-2 text-sm font-normal" placeholder="Resultado da conclusão" /></label><label className="grid gap-1 text-xs font-semibold text-slate-600 sm:col-span-2">Avaliação da eficácia<textarea name="effectivenessResult" className="rounded-lg border border-slate-300 bg-white p-2 text-sm font-normal" placeholder="Como a eficácia foi verificada" /></label><button className="w-fit rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Atualizar status</button></form></li>)}</ul>}
      </div>
    </div>
  </section>;
}
