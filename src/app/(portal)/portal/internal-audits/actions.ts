"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/current-user";
import { completeInternalAuditSchema, internalAuditFindingSchema, internalAuditSchema } from "@/lib/validation/internal-audit";

export async function createInternalAudit(formData: FormData) {
  const plannedAtValue = formData.get("plannedAt");
  const plannedAt = plannedAtValue ? new Date(String(plannedAtValue)) : undefined;
  const parsed = internalAuditSchema.safeParse({ organizationId: formData.get("organizationId"), title: formData.get("title"), scope: formData.get("scope"), criteria: formData.get("criteria"), plannedAt: plannedAt?.toISOString() });
  if (!parsed.success) redirect("/portal/internal-audits?message=Dados+da+auditoria+inv%C3%A1lidos.");
  const { supabase } = await requireUser();
  const value = parsed.data;
  const { error } = await supabase.rpc("create_internal_audit", { target_organization_id: value.organizationId, target_title: value.title, target_scope: value.scope, target_criteria: value.criteria, target_planned_at: value.plannedAt ?? null });
  if (error) redirect("/portal/internal-audits?message=N%C3%A3o+foi+poss%C3%ADvel+criar+a+auditoria.");
  revalidatePath("/portal/internal-audits");
  redirect("/portal/internal-audits?message=Auditoria+interna+planejada+com+auditoria.");
}

export async function createInternalAuditFinding(formData: FormData) {
  const parsed = internalAuditFindingSchema.safeParse({ auditId: formData.get("auditId"), findingType: formData.get("findingType"), requirementReference: formData.get("requirementReference") || undefined, description: formData.get("description"), evidence: formData.get("evidence") || undefined, createNonconformity: formData.get("createNonconformity") === "true" });
  if (!parsed.success) redirect("/portal/internal-audits?message=Constata%C3%A7%C3%A3o+de+auditoria+inv%C3%A1lida.");
  const { supabase } = await requireUser();
  const value = parsed.data;
  const { error } = await supabase.rpc("create_internal_audit_finding", { target_audit_id: value.auditId, target_type: value.findingType, target_requirement: value.requirementReference ?? "", target_description: value.description, target_evidence: value.evidence ?? null, target_create_nonconformity: value.createNonconformity });
  if (error) redirect("/portal/internal-audits?message=N%C3%A3o+foi+poss%C3%ADvel+registrar+a+constata%C3%A7%C3%A3o.");
  revalidatePath("/portal/internal-audits");
  revalidatePath("/portal/nonconformities");
  redirect("/portal/internal-audits?message=Constata%C3%A7%C3%A3o+registrada+com+auditoria.");
}

export async function completeInternalAudit(formData: FormData) {
  const parsed = completeInternalAuditSchema.safeParse({ auditId: formData.get("auditId") });
  if (!parsed.success) redirect("/portal/internal-audits?message=Auditoria+inv%C3%A1lida.");
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("complete_internal_audit", { target_audit_id: parsed.data.auditId });
  if (error) redirect("/portal/internal-audits?message=N%C3%A3o+foi+poss%C3%ADvel+concluir+a+auditoria.");
  revalidatePath("/portal/internal-audits");
  redirect("/portal/internal-audits?message=Auditoria+conclu%C3%ADda+com+auditoria.");
}
