"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/current-user";
import { governanceControlSchema } from "@/lib/validation/governance-control";

const path = "/portal/governance-controls";

export async function createGovernanceControl(formData: FormData) {
  const parsed = governanceControlSchema.safeParse({
    organizationId: formData.get("organizationId"),
    framework: formData.get("framework"),
    referenceCode: formData.get("referenceCode"),
    processName: formData.get("processName"),
    controlObjective: formData.get("controlObjective"),
    evidenceDescription: formData.get("evidenceDescription") || undefined,
    reviewFrequencyDays: formData.get("reviewFrequencyDays") || undefined,
  });
  if (!parsed.success) redirect(`${path}?message=Dados+do+controle+inválidos.`);

  const { supabase, user } = await requireUser();
  const value = parsed.data;
  const { error } = await supabase.from("governance_controls").insert({
    organization_id: value.organizationId,
    framework: value.framework,
    reference_code: value.referenceCode,
    process_name: value.processName,
    control_objective: value.controlObjective,
    evidence_description: value.evidenceDescription,
    review_frequency_days: value.reviewFrequencyDays,
    created_by: user.id,
    updated_by: user.id,
  });
  if (error) redirect(`${path}?message=Não+foi+possível+registrar+o+controle.`);

  revalidatePath(path);
  redirect(`${path}?message=Controle+registrado+com+sucesso.`);
}
