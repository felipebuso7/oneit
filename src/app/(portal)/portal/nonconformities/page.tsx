import { requireUser } from "@/lib/auth/current-user";
import { OneitPageHeader } from "@/components/oneit-page-header";
import { createNonconformity, createNonconformityActionPlan, linkNonconformitySource, saveNonconformityCauseAnalysis, updateNonconformityWorkflow } from "./actions";

type PageProps = { searchParams: Promise<{ message?: string }> };

const labels = {
  NONCONFORMITY: "Não conformidade",
  OBSERVATION: "Observação",
  IMPROVEMENT_OPPORTUNITY: "Oportunidade de melhoria",
  OPEN: "Aberta",
  CORRECTION: "Correção",
  CORRECTIVE_ACTION: "Ação corretiva",
  EFFECTIVENESS: "Em eficácia",
  CLOSED: "Encerrada",
} as const;

function labelFor(value: string) {
  return labels[value as keyof typeof labels] ?? value;
}

const nextStatus = {
  OPEN: "CORRECTION",
  CORRECTION: "CORRECTIVE_ACTION",
  CORRECTIVE_ACTION: "EFFECTIVENESS",
  EFFECTIVENESS: "CLOSED",
} as const;

export default async function NonconformitiesPage({ searchParams }: PageProps) {
  const [{ supabase, user }, { message }] = await Promise.all([requireUser(), searchParams]);
  const { data: roles } = await supabase
    .from("user_roles")
    .select("organization_id")
    .eq("user_id", user.id)
    .in("role", ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER", "AUDITOR"]);
  const organizationIds = [...new Set((roles ?? []).map((role) => role.organization_id))];
  const [{ data: organizations }, { data: records }] = await Promise.all([
    organizationIds.length
      ? supabase.from("organizations").select("id,name").in("id", organizationIds).order("name")
      : Promise.resolve({ data: [] }),
    organizationIds.length
      ? supabase
          .from("nonconformities")
          .select("id,nonconformity_number,record_type,status,requirement_reference,description,due_at,created_at")
          .in("organization_id", organizationIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);
  const recordIds = (records ?? []).map((record) => record.id);
  const [{ data: actionPlans }, { data: sources }, { data: analyses }] = await Promise.all([
    recordIds.length ? supabase.from("action_plans").select("id,source_entity_id,action_number,status,description").eq("source_entity_type", "NONCONFORMITY").in("source_entity_id", recordIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    recordIds.length ? supabase.from("nonconformity_sources").select("nonconformity_id,source_kind,source_system,external_reference,source_url,note").in("nonconformity_id", recordIds).order("linked_at", { ascending: false }) : Promise.resolve({ data: [] }),
    recordIds.length ? supabase.from("nonconformity_cause_analyses").select("nonconformity_id,method,root_cause,containment_action,effectiveness_due_at").in("nonconformity_id", recordIds) : Promise.resolve({ data: [] }),
  ]);
  const plansByRecord = new Map<string, NonNullable<typeof actionPlans>>();
  for (const plan of actionPlans ?? []) plansByRecord.set(plan.source_entity_id, [...(plansByRecord.get(plan.source_entity_id) ?? []), plan]);
  const sourcesByRecord = new Map<string, NonNullable<typeof sources>>();
  for (const source of sources ?? []) sourcesByRecord.set(source.nonconformity_id, [...(sourcesByRecord.get(source.nonconformity_id) ?? []), source]);
  const analysisByRecord = new Map((analyses ?? []).map((analysis) => [analysis.nonconformity_id, analysis]));

  return <section className="mx-auto max-w-6xl p-5 sm:p-8">
    <OneitPageHeader eyebrow="GOVERNANÇA · MELHORIA CONTÍNUA" title="Não conformidades e melhorias" description="Registre achados, causas, ações corretivas e verificação de eficácia em uma única jornada." />
    <p className="mt-2 text-sm text-slate-600">Registro de achados para correção, ação corretiva e avaliação de eficácia.</p>
    {message ? <p role="status" className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">{message}</p> : null}
    <form action={createNonconformity} className="mt-6 grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-2">
      <select name="organizationId" required defaultValue="" className="rounded border p-2"><option disabled value="">Organização</option>{(organizations ?? []).map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select>
      <select name="recordType" required defaultValue="" className="rounded border p-2"><option disabled value="">Tipo de registro</option><option value="NONCONFORMITY">Não conformidade</option><option value="OBSERVATION">Observação</option><option value="IMPROVEMENT_OPPORTUNITY">Oportunidade de melhoria</option></select>
      <input name="requirementReference" maxLength={500} className="rounded border p-2" placeholder="Referência do requisito (ex.: ISO/IEC 20000-1 8.7)" />
      <input name="dueAt" type="datetime-local" className="rounded border p-2" />
      <textarea name="description" required minLength={10} className="min-h-28 rounded border p-2 sm:col-span-2" placeholder="Descrição objetiva do achado e da evidência" />
      <button className="w-fit rounded bg-slate-900 px-4 py-2 text-white sm:col-span-2">Registrar achado</button>
    </form>
    <ul className="mt-6 divide-y rounded-xl border bg-white">
      {(records ?? []).map((record) => {
        const step = nextStatus[record.status as keyof typeof nextStatus];
        const plans = plansByRecord.get(record.id) ?? []; const linkedSources = sourcesByRecord.get(record.id) ?? []; const analysis = analysisByRecord.get(record.id);
        return <li key={record.id} className="p-4 text-sm"><div className="flex flex-wrap gap-x-2"><strong>{record.nonconformity_number}</strong><span>· {labelFor(record.record_type)}</span><span>· {labelFor(record.status)}</span></div><p className="mt-1">{record.description}</p>{record.requirement_reference ? <p className="mt-1 text-slate-500">Requisito: {record.requirement_reference}</p> : null}{record.due_at ? <p className="mt-1 text-slate-500">Prazo: {new Date(record.due_at).toLocaleString("pt-BR")}</p> : null}
          {linkedSources.length ? <p className="mt-3 text-slate-600">Origem: {linkedSources.map((source) => `${source.source_kind}${source.source_system ? `/${source.source_system}` : ""} · ${source.external_reference ?? "sem referência"}`).join("; ")}</p> : null}
          {analysis ? <p className="mt-2 text-slate-600">Análise causal: {analysis.method} · eficácia até {analysis.effectiveness_due_at ? new Date(analysis.effectiveness_due_at).toLocaleDateString("pt-BR") : "a definir"}</p> : null}
          {plans.length ? <p className="mt-3 text-slate-600">Planos: {plans.map((plan) => `${plan.action_number} (${plan.status})`).join(", ")}</p> : null}
          {record.status !== "CLOSED" ? <details className="mt-3 rounded border bg-slate-50 p-3"><summary className="cursor-pointer font-medium">Origem e análise de causa</summary><div className="mt-3 grid gap-4 lg:grid-cols-2"><form action={linkNonconformitySource} className="grid gap-2"><input type="hidden" name="nonconformityId" value={record.id}/><strong>Vincular origem</strong><select name="sourceKind" className="rounded border p-2"><option value="TICKET">Chamado</option><option value="AUDIT">Auditoria</option><option value="RITUAL">Rito SGSTI</option><option value="CUSTOMER_FEEDBACK">Feedback do cliente</option><option value="SUPPLIER">Fornecedor</option><option value="RISK">Risco</option><option value="MANUAL">Manual</option></select><input name="sourceSystem" className="rounded border p-2" placeholder="Sistema, ex.: Milldesk"/><input required name="externalReference" className="rounded border p-2" placeholder="Identificador, ex.: REQ-0290"/><input name="sourceUrl" className="rounded border p-2" placeholder="Link opcional"/><textarea name="note" className="rounded border p-2" placeholder="Contexto do vínculo"/><button className="w-fit rounded border px-3 py-2">Vincular</button></form><form action={saveNonconformityCauseAnalysis} className="grid gap-2"><input type="hidden" name="nonconformityId" value={record.id}/><strong>{analysis ? "Atualizar análise causal" : "Registrar análise causal"}</strong><select name="method" defaultValue={analysis?.method ?? "FIVE_WHYS"} className="rounded border p-2"><option value="FIVE_WHYS">5 porquês</option><option value="ISHIKAWA">Ishikawa</option><option value="PROCESS_ANALYSIS">Análise de processo</option><option value="FREEFORM">Análise livre fundamentada</option></select><textarea required minLength={10} name="problemStatement" className="rounded border p-2" placeholder="Definição do problema"/><textarea name="directCause" className="rounded border p-2" placeholder="Causa direta"/><textarea name="contributingFactors" className="rounded border p-2" placeholder="Fatores contribuintes"/><textarea required minLength={10} name="rootCause" defaultValue={analysis?.root_cause ?? ""} className="rounded border p-2" placeholder="Causa raiz"/><textarea name="containmentAction" defaultValue={analysis?.containment_action ?? ""} className="rounded border p-2" placeholder="Correção/ação de contenção"/><label className="text-xs">Data para verificar eficácia<input name="effectivenessDueAt" type="datetime-local" defaultValue={analysis?.effectiveness_due_at ? new Date(analysis.effectiveness_due_at).toISOString().slice(0,16) : ""} className="mt-1 w-full rounded border p-2"/></label><button className="w-fit rounded border px-3 py-2">Salvar análise</button></form></div></details> : null}
          {record.status !== "CLOSED" ? <form action={createNonconformityActionPlan} className="mt-3 grid gap-2 rounded border bg-slate-50 p-3 sm:grid-cols-3"><input type="hidden" name="nonconformityId" value={record.id}/><input name="description" required minLength={10} className="rounded border p-2 sm:col-span-2" placeholder="Nova ação corretiva/preventiva"/><input name="priority" type="number" min="1" max="5" required className="rounded border p-2" placeholder="Prioridade"/><input name="dueAt" type="datetime-local" className="rounded border p-2"/><button className="w-fit rounded border px-3 py-2">Vincular plano de ação</button></form> : null}
          {step ? <form action={updateNonconformityWorkflow} className="mt-3 grid gap-2 rounded border bg-slate-50 p-3"><input type="hidden" name="nonconformityId" value={record.id}/><input type="hidden" name="status" value={step}/><strong>Próxima etapa: {labelFor(step)}</strong>{step === "CORRECTION" ? <textarea required name="immediateCorrection" minLength={10} className="rounded border p-2" placeholder="Correção imediata realizada"/> : null}{step === "CORRECTIVE_ACTION" ? <textarea required name="rootCause" minLength={10} className="rounded border p-2" placeholder="Causa raiz identificada"/> : null}{step === "EFFECTIVENESS" ? <p className="text-slate-600">Todos os planos vinculados precisam estar com eficácia verificada.</p> : null}{step === "CLOSED" ? <textarea required name="effectivenessResult" minLength={10} className="rounded border p-2" placeholder="Evidência da eficácia e decisão de encerramento"/> : null}<button className="w-fit rounded border px-3 py-2">Avançar etapa</button></form> : null}
        </li>;
      })}
      {(records ?? []).length === 0 ? <li className="p-4 text-sm text-slate-500">Nenhum achado visível para suas organizações.</li> : null}
    </ul>
  </section>;
}
