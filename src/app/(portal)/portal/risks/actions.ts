"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { riskSchema, riskWorkflowSchema } from "@/lib/validation/risk";

export async function createRisk(formData: FormData) {
  const parsed = riskSchema.safeParse({ organizationId: formData.get("organizationId"), title: formData.get("title"), description: formData.get("description"), likelihood: formData.get("likelihood"), impact: formData.get("impact") });
  if (!parsed.success) redirect("/portal/risks?message=Dados+do+risco+inv%C3%A1lidos.");
  const { supabase } = await requireUser(); const value = parsed.data;
  const { error } = await supabase.rpc("create_risk", { target_organization_id: value.organizationId, target_title: value.title, target_description: value.description, target_likelihood: value.likelihood, target_impact: value.impact });
  if (error) redirect("/portal/risks?message=N%C3%A3o+foi+poss%C3%ADvel+registrar+o+risco.");
  revalidatePath("/portal/risks"); redirect("/portal/risks?message=Risco+avaliado+e+registrado+com+auditoria.");
}

export async function updateRiskWorkflow(formData: FormData) {
  const parsed = riskWorkflowSchema.safeParse({ riskId: formData.get("riskId"), status: formData.get("status"), treatment: formData.get("treatment") || undefined, treatmentPlan: formData.get("treatmentPlan") || undefined, treatmentResult: formData.get("treatmentResult") || undefined, residualLikelihood: formData.get("residualLikelihood") || undefined, residualImpact: formData.get("residualImpact") || undefined, acceptanceJustification: formData.get("acceptanceJustification") || undefined });
  if (!parsed.success) redirect("/portal/risks?message=Atualiza%C3%A7%C3%A3o+de+risco+inv%C3%A1lida.");
  const { supabase } = await requireUser(); const value = parsed.data;
  const { error } = await supabase.rpc("update_risk_workflow", { target_risk_id: value.riskId, target_status: value.status, target_treatment: value.treatment ?? null, target_treatment_plan: value.treatmentPlan ?? null, target_treatment_result: value.treatmentResult ?? null, target_residual_likelihood: value.residualLikelihood ?? null, target_residual_impact: value.residualImpact ?? null, target_acceptance_justification: value.acceptanceJustification ?? null });
  if (error) redirect("/portal/risks?message=Transi%C3%A7%C3%A3o+recusada.+Preencha+as+evid%C3%AAncias+obrigat%C3%B3rias+para+a+etapa.");
  revalidatePath("/portal/risks"); redirect("/portal/risks?message=Etapa+do+risco+atualizada+com+auditoria.");
}
