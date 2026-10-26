"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { serviceObjectiveEvaluationSchema, serviceObjectiveSchema } from "@/lib/validation/service-objective";

export async function createServiceObjective(formData: FormData) {
 const parsed = serviceObjectiveSchema.safeParse({ organizationId: formData.get("organizationId"), title: formData.get("title"), metricDefinition: formData.get("metricDefinition"), unit: formData.get("unit"), baseline: formData.get("baseline") || undefined, target: formData.get("target"), direction: formData.get("direction"), periodStart: formData.get("periodStart"), periodEnd: formData.get("periodEnd") });
 if (!parsed.success) redirect("/portal/service-objectives?message=Dados+do+objetivo+inv%C3%A1lidos.");
 const { supabase } = await requireUser(); const value = parsed.data;
 const { error } = await supabase.rpc("create_service_objective", { target_organization_id: value.organizationId, target_title: value.title, target_definition: value.metricDefinition, target_unit: value.unit, target_baseline: value.baseline ?? null, target_target: value.target, target_direction: value.direction, target_start: value.periodStart, target_end: value.periodEnd });
 if (error) redirect("/portal/service-objectives?message=N%C3%A3o+foi+poss%C3%ADvel+criar+o+objetivo.");
 revalidatePath("/portal/service-objectives"); redirect("/portal/service-objectives?message=Objetivo+criado+com+auditoria.");
}
export async function evaluateServiceObjective(formData: FormData) {
 const parsed = serviceObjectiveEvaluationSchema.safeParse({ objectiveId: formData.get("objectiveId"), actual: formData.get("actual"), evidence: formData.get("evidence") });
 if (!parsed.success) redirect("/portal/service-objectives?message=Avalia%C3%A7%C3%A3o+inv%C3%A1lida.");
 const { supabase } = await requireUser(); const value = parsed.data;
 const { error } = await supabase.rpc("evaluate_service_objective", { target_objective_id: value.objectiveId, target_actual: value.actual, target_evidence: value.evidence });
 if (error) redirect("/portal/service-objectives?message=N%C3%A3o+foi+poss%C3%ADvel+avaliar+o+objetivo.");
 revalidatePath("/portal/service-objectives"); redirect("/portal/service-objectives?message=Objetivo+avaliado+com+auditoria.");
}
