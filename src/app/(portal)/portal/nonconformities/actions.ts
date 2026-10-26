"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/current-user";
import { nonconformitySchema } from "@/lib/validation/nonconformity";
import { nonconformityActionPlanSchema, nonconformityWorkflowSchema } from "@/lib/validation/nonconformity-workflow";
import { nonconformityCauseAnalysisSchema, nonconformitySourceSchema } from "@/lib/validation/nonconformity-traceability";

export async function createNonconformity(formData: FormData) {
  const dueAtValue = formData.get("dueAt");
  const dueAt = dueAtValue ? new Date(String(dueAtValue)) : undefined;
  const parsed = nonconformitySchema.safeParse({
    organizationId: formData.get("organizationId"),
    recordType: formData.get("recordType"),
    requirementReference: formData.get("requirementReference") || undefined,
    description: formData.get("description"),
    dueAt: dueAt?.toISOString(),
  });

  if (!parsed.success) redirect("/portal/nonconformities?message=Dados+da+NC+inv%C3%A1lidos.");

  const { supabase } = await requireUser();
  const value = parsed.data;
  const { error } = await supabase.rpc("create_nonconformity", {
    target_organization_id: value.organizationId,
    target_type: value.recordType,
    target_requirement: value.requirementReference ?? "",
    target_description: value.description,
    target_due_at: value.dueAt ?? null,
  });

  if (error) redirect("/portal/nonconformities?message=N%C3%A3o+foi+poss%C3%ADvel+registrar+a+NC.");

  revalidatePath("/portal/nonconformities");
  redirect("/portal/nonconformities?message=Registro+criado+com+rastreabilidade+de+auditoria.");
}

export async function createNonconformityActionPlan(formData: FormData) {
  const dueAtValue = formData.get("dueAt");
  const dueAt = dueAtValue ? new Date(String(dueAtValue)) : undefined;
  const parsed = nonconformityActionPlanSchema.safeParse({
    nonconformityId: formData.get("nonconformityId"),
    description: formData.get("description"),
    priority: formData.get("priority"),
    dueAt: dueAt?.toISOString(),
  });
  if (!parsed.success) redirect("/portal/nonconformities?message=Plano+de+a%C3%A7%C3%A3o+inv%C3%A1lido.");

  const { supabase } = await requireUser();
  const value = parsed.data;
  const { error } = await supabase.rpc("create_action_plan_from_nonconformity", {
    target_nonconformity_id: value.nonconformityId,
    target_description: value.description,
    target_priority: value.priority,
    target_due_at: value.dueAt ?? null,
  });
  if (error) redirect("/portal/nonconformities?message=N%C3%A3o+foi+poss%C3%ADvel+vincular+o+plano+de+a%C3%A7%C3%A3o.");

  revalidatePath("/portal/nonconformities");
  revalidatePath("/portal/action-plans");
  redirect("/portal/nonconformities?message=Plano+de+a%C3%A7%C3%A3o+vinculado+com+auditoria.");
}

export async function updateNonconformityWorkflow(formData: FormData) {
  const parsed = nonconformityWorkflowSchema.safeParse({
    nonconformityId: formData.get("nonconformityId"),
    status: formData.get("status"),
    immediateCorrection: formData.get("immediateCorrection") || undefined,
    rootCause: formData.get("rootCause") || undefined,
    effectivenessResult: formData.get("effectivenessResult") || undefined,
  });
  if (!parsed.success) redirect("/portal/nonconformities?message=Atualiza%C3%A7%C3%A3o+de+NC+inv%C3%A1lida.");

  const { supabase } = await requireUser();
  const value = parsed.data;
  const { error } = await supabase.rpc("update_nonconformity_workflow", {
    target_nonconformity_id: value.nonconformityId,
    target_status: value.status,
    target_immediate_correction: value.immediateCorrection ?? null,
    target_root_cause: value.rootCause ?? null,
    target_effectiveness_result: value.effectivenessResult ?? null,
  });
  if (error) redirect("/portal/nonconformities?message=Transi%C3%A7%C3%A3o+recusada.+Registre+os+dados+e+planos+exigidos+para+esta+etapa.");

  revalidatePath("/portal/nonconformities");
  redirect("/portal/nonconformities?message=Etapa+da+NC+atualizada+com+auditoria.");
}

export async function linkNonconformitySource(formData: FormData) {
  const parsed = nonconformitySourceSchema.safeParse({
    nonconformityId: formData.get("nonconformityId"), sourceKind: formData.get("sourceKind"), sourceSystem: formData.get("sourceSystem") || undefined,
    externalReference: formData.get("externalReference"), sourceUrl: formData.get("sourceUrl") || undefined, note: formData.get("note") || undefined,
  });
  if (!parsed.success) redirect("/portal/nonconformities?message=V%C3%ADnculo+de+origem+inv%C3%A1lido.");
  const { supabase } = await requireUser(); const value = parsed.data;
  const { error } = await supabase.rpc("link_nonconformity_source", { target_nonconformity_id: value.nonconformityId, target_source_kind: value.sourceKind, target_source_system: value.sourceSystem ?? null, target_external_reference: value.externalReference, target_source_url: value.sourceUrl ?? null, target_note: value.note ?? null });
  if (error) redirect("/portal/nonconformities?message=N%C3%A3o+foi+poss%C3%ADvel+vincular+a+origem.");
  revalidatePath("/portal/nonconformities"); redirect("/portal/nonconformities?message=Origem+vinculada+com+rastreabilidade.");
}

export async function saveNonconformityCauseAnalysis(formData: FormData) {
  const date = formData.get("effectivenessDueAt"); const dueAt = date ? new Date(String(date)) : undefined;
  const parsed = nonconformityCauseAnalysisSchema.safeParse({
    nonconformityId: formData.get("nonconformityId"), method: formData.get("method"), problemStatement: formData.get("problemStatement"), directCause: formData.get("directCause") || undefined,
    contributingFactors: formData.get("contributingFactors") || undefined, rootCause: formData.get("rootCause"), containmentAction: formData.get("containmentAction") || undefined, effectivenessDueAt: dueAt?.toISOString(),
  });
  if (!parsed.success) redirect("/portal/nonconformities?message=An%C3%A1lise+causal+inv%C3%A1lida.");
  const { supabase } = await requireUser(); const value = parsed.data;
  const { error } = await supabase.rpc("save_nonconformity_cause_analysis", { target_nonconformity_id: value.nonconformityId, target_method: value.method, target_problem_statement: value.problemStatement, target_direct_cause: value.directCause ?? null, target_contributing_factors: value.contributingFactors ?? null, target_root_cause: value.rootCause, target_containment_action: value.containmentAction ?? null, target_effectiveness_due_at: value.effectivenessDueAt ?? null });
  if (error) redirect("/portal/nonconformities?message=N%C3%A3o+foi+poss%C3%ADvel+salvar+a+an%C3%A1lise+causal.");
  revalidatePath("/portal/nonconformities"); redirect("/portal/nonconformities?message=An%C3%A1lise+causal+registrada+com+auditoria.");
}
