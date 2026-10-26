"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/current-user";

const path = "/portal/sgsti/controls";
const controlSchema = z.object({
  organizationId: z.string().uuid(), controlCode: z.string().trim().min(2).max(80), title: z.string().trim().min(3).max(240),
  description: z.string().trim().min(10).max(10000), requirementReference: z.string().trim().max(240).optional(), policyReference: z.string().trim().max(240).optional(),
  riskStatement: z.string().trim().max(10000).optional(), controlKind: z.enum(["PREVENTIVE", "DETECTIVE", "CORRECTIVE", "DIRECTIVE"]),
  frequency: z.enum(["CONTINUOUS", "DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL", "ON_DEMAND"]),
  ownerId: z.string().uuid().optional(), testMethod: z.string().trim().max(10000).optional(), evidenceExpectation: z.string().trim().max(10000).optional(), nextTestAt: z.string().date().optional(),
});

export async function createSgstiControl(formData: FormData) {
  const parsed = controlSchema.safeParse({ organizationId: formData.get("organizationId"), controlCode: formData.get("controlCode"), title: formData.get("title"), description: formData.get("description"), requirementReference: formData.get("requirementReference") || undefined, policyReference: formData.get("policyReference") || undefined, riskStatement: formData.get("riskStatement") || undefined, controlKind: formData.get("controlKind"), frequency: formData.get("frequency"), ownerId: formData.get("ownerId") || undefined, testMethod: formData.get("testMethod") || undefined, evidenceExpectation: formData.get("evidenceExpectation") || undefined, nextTestAt: formData.get("nextTestAt") || undefined });
  if (!parsed.success) redirect(`${path}?message=Revise+os+campos+obrigat%C3%B3rios+do+controle.`);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("create_sgsti_control", { target_organization_id: parsed.data.organizationId, target_control_code: parsed.data.controlCode, target_title: parsed.data.title, target_description: parsed.data.description, target_requirement_reference: parsed.data.requirementReference ?? null, target_policy_reference: parsed.data.policyReference ?? null, target_risk_statement: parsed.data.riskStatement ?? null, target_control_kind: parsed.data.controlKind, target_frequency: parsed.data.frequency, target_owner_id: parsed.data.ownerId ?? null, target_test_method: parsed.data.testMethod ?? null, target_evidence_expectation: parsed.data.evidenceExpectation ?? null, target_next_test_at: parsed.data.nextTestAt ?? null });
  if (error) redirect(`${path}?message=N%C3%A3o+foi+poss%C3%ADvel+criar+o+controle.+Confirme+seu+acesso+e+os+dados.`);
  revalidatePath(path); redirect(`${path}?message=Controle+criado+com+rastreabilidade+de+auditoria.`);
}

export async function recordSgstiControlTest(formData: FormData) {
  const controlId = z.string().uuid().safeParse(formData.get("controlId"));
  const testedAt = z.string().date().safeParse(formData.get("testedAt"));
  const conclusion = z.enum(["EFFECTIVE", "PARTIALLY_EFFECTIVE", "INEFFECTIVE", "NOT_APPLICABLE"]).safeParse(formData.get("conclusion"));
  const evidenceReference = z.string().trim().min(3).max(10000).safeParse(formData.get("evidenceReference"));
  const findingSummary = String(formData.get("findingSummary") ?? "").trim();
  if (!controlId.success || !testedAt.success || !conclusion.success || !evidenceReference.success || (["PARTIALLY_EFFECTIVE", "INEFFECTIVE"].includes(conclusion.data) && findingSummary.length < 10)) redirect(`${path}?message=Informe+data%2C+evid%C3%AAncia+e+achado+quando+o+controle+n%C3%A3o+for+efetivo.`);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("record_sgsti_control_test", { target_control_id: controlId.data, target_tested_at: testedAt.data, target_conclusion: conclusion.data, target_finding_summary: findingSummary || null, target_evidence_reference: evidenceReference.data, target_action_plan_id: null });
  if (error) redirect(`${path}?message=N%C3%A3o+foi+poss%C3%ADvel+registrar+o+teste+do+controle.`);
  revalidatePath(path); redirect(`${path}?message=Teste+registrado+e+pr%C3%B3xima+revis%C3%A3o+atualizada.`);
}
