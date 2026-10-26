"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/current-user";
import { sgstiActivityTemplateSchema, sgstiEvidenceSchema, sgstiExecutionUpdateSchema } from "@/lib/validation/sgsti";

const path = "/portal/sgsti";
async function mayManage(organizationId: string) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("has_sgsti_management_access", { target_organization_id: organizationId });
  return { supabase, allowed: !error && data === true };
}

export async function createSgstiActivity(formData: FormData) {
  const raw = {
    organizationId: formData.get("organizationId"), title: formData.get("title"), activityType: formData.get("activityType"),
    periodicity: formData.get("periodicity"), effectiveFrom: formData.get("effectiveFrom"), leadTimeDays: formData.get("leadTimeDays"),
    dueAfterDays: formData.get("dueAfterDays"), reminderDays: String(formData.get("reminderDays") ?? "15,3,0").split(",").map((value) => Number(value.trim())).filter(Number.isFinite),
    isoReference: formData.get("isoReference") || null, policyReference: formData.get("policyReference") || null,
    customIntervalDays: formData.get("customIntervalDays") || null, defaultResponsibleId: formData.get("responsibleId") || null,
  };
  const parsed = sgstiActivityTemplateSchema.safeParse(raw);
  if (!parsed.success) redirect(`${path}?message=Revise+os+campos+obrigat%C3%B3rios+do+rito.`);
  const { supabase, allowed } = await mayManage(parsed.data.organizationId);
  if (!allowed) redirect(`${path}?message=Seu+perfil+n%C3%A3o+tem+permiss%C3%A3o+para+criar+ritos.`);
  const { error } = await supabase.rpc("create_sgsti_activity_template", {
    target_organization_id: parsed.data.organizationId, target_title: parsed.data.title, target_activity_type: parsed.data.activityType,
    target_periodicity: parsed.data.periodicity, target_effective_from: parsed.data.effectiveFrom, target_lead_time_days: parsed.data.leadTimeDays,
    target_due_after_days: parsed.data.dueAfterDays, target_reminder_days: parsed.data.reminderDays, target_requirement_reference: parsed.data.isoReference ?? null,
    target_policy_reference: parsed.data.policyReference ?? null, target_custom_interval_days: parsed.data.customIntervalDays ?? null,
    target_responsible_id: parsed.data.defaultResponsibleId ?? null,
  });
  if (error) redirect(`${path}?message=N%C3%A3o+foi+poss%C3%ADvel+criar+o+rito.+Verifique+a+configura%C3%A7%C3%A3o+da+organiza%C3%A7%C3%A3o.`);
  await supabase.rpc("generate_sgsti_occurrences", { target_organization_id: parsed.data.organizationId, target_through: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10) });
  revalidatePath(path);
  redirect(`${path}?message=Rito+criado+e+agenda+atualizada.`);
}

export async function recordSgstiExecution(formData: FormData) {
  const parsed = sgstiExecutionUpdateSchema.safeParse({
    occurrenceId: formData.get("occurrenceId"), attendees: formData.get("attendees") || undefined,
    minutes: formData.get("minutes") || undefined, decisions: formData.get("decisions") || undefined,
    actionPlan: formData.get("actionPlan") || undefined, resultSummary: formData.get("resultSummary") || undefined,
    justification: formData.get("justification") || undefined, status: formData.get("status"),
  });
  if (!parsed.success) redirect(`${path}?message=Para+concluir%2C+registre+ata+e+resultado+da+atividade.`);
  const { supabase } = await requireUser();
  const { data: occurrence } = await supabase.from("sgsti_activity_occurrences").select("organization_id,status").eq("id", parsed.data.occurrenceId).maybeSingle();
  if (!occurrence) redirect(`${path}?message=Atividade+n%C3%A3o+encontrada.`);
  const access = await mayManage(occurrence.organization_id);
  if (!access.allowed) redirect(`${path}?message=Seu+perfil+n%C3%A3o+tem+permiss%C3%A3o+para+registrar+esta+atividade.`);
  // Completion is always decided by the independent approval queue, never directly by the author.
  const requestedCompletion = parsed.data.status === "COMPLETED";
  const { error } = await supabase.rpc("record_sgsti_activity_execution", {
    target_occurrence_id: parsed.data.occurrenceId, target_status: requestedCompletion ? "UNDER_REVIEW" : parsed.data.status, target_attendees: parsed.data.attendees ?? null,
    target_minutes: parsed.data.minutes ?? null, target_decisions: parsed.data.decisions ?? null, target_action_plan: parsed.data.actionPlan ?? null,
    target_result_summary: parsed.data.resultSummary ?? null, target_justification: parsed.data.justification ?? null,
  });
  if (error) redirect(`${path}?message=N%C3%A3o+foi+poss%C3%ADvel+salvar+o+registro.+Confirme+os+campos+obrigat%C3%B3rios+e+seu+perfil.`);
  revalidatePath(path);
  redirect(`${path}?message=${requestedCompletion ? "Registro+salvo.+Envie+para+a+fila+de+aprova%C3%A7%C3%B5es+para+conclus%C3%A3o+independente." : "Registro+da+atividade+salvo+com+sucesso."}`);
}

export async function addSgstiEvidence(formData: FormData) {
  const parsed = sgstiEvidenceSchema.safeParse({
    occurrenceId: formData.get("occurrenceId"), title: formData.get("title"), evidenceKind: formData.get("evidenceKind"),
    externalUrl: formData.get("externalUrl") || null, storageKey: formData.get("storageKey") || null, note: formData.get("note") || null,
  });
  if (!parsed.success || !parsed.data.occurrenceId) redirect(`${path}?message=Informe+o+tipo%2C+t%C3%ADtulo+e+refer%C3%AAncia+da+evid%C3%AAncia.`);
  const { supabase } = await requireUser();
  const { data: occurrence } = await supabase.from("sgsti_activity_occurrences").select("organization_id").eq("id", parsed.data.occurrenceId).maybeSingle();
  if (!occurrence) redirect(`${path}?message=Atividade+n%C3%A3o+encontrada.`);
  const access = await mayManage(occurrence.organization_id);
  if (!access.allowed) redirect(`${path}?message=Seu+perfil+n%C3%A3o+tem+permiss%C3%A3o+para+vincular+evid%C3%AAncias.`);
  const { error } = await supabase.rpc("create_sgsti_activity_evidence", {
    target_occurrence_id: parsed.data.occurrenceId, target_title: parsed.data.title, target_kind: parsed.data.evidenceKind,
    target_external_url: parsed.data.externalUrl ?? null, target_storage_key: parsed.data.storageKey ?? null, target_note: parsed.data.note ?? null,
  });
  if (error) redirect(`${path}?activity=${parsed.data.occurrenceId}&message=N%C3%A3o+foi+poss%C3%ADvel+vincular+a+evid%C3%AAncia.`);
  revalidatePath(path);
  redirect(`${path}?activity=${parsed.data.occurrenceId}&message=Evid%C3%AAncia+vinculada+ao+rito.`);
}

export async function recordSgstiMeetingMetadata(formData: FormData) {
  const occurrenceId = z.string().uuid().safeParse(formData.get("occurrenceId"));
  const localDateTime = z.string().trim().min(16).max(40).refine((value) => !Number.isNaN(Date.parse(value))).optional();
  const startedAt = localDateTime.safeParse(formData.get("startedAt") || undefined);
  const endedAt = localDateTime.safeParse(formData.get("endedAt") || undefined);
  const location = z.string().trim().max(500).optional().safeParse(formData.get("location") || undefined);
  const facilitator = z.string().trim().max(240).optional().safeParse(formData.get("facilitator") || undefined);
  const attendeeRoles = z.string().trim().max(10000).optional().safeParse(formData.get("attendeeRoles") || undefined);
  if (!occurrenceId.success || !startedAt.success || !endedAt.success || !location.success || !facilitator.success || !attendeeRoles.success || (startedAt.data && endedAt.data && endedAt.data < startedAt.data)) redirect(`${path}?message=Dados+da+ata+estruturada+inv%C3%A1lidos.`);
  const { supabase } = await requireUser();
  const { data: occurrence } = await supabase.from("sgsti_activity_occurrences").select("organization_id").eq("id", occurrenceId.data).maybeSingle();
  if (!occurrence) redirect(`${path}?message=Atividade+n%C3%A3o+encontrada.`);
  const access = await mayManage(occurrence.organization_id);
  if (!access.allowed) redirect(`${path}?message=Seu+perfil+n%C3%A3o+tem+permiss%C3%A3o+para+registrar+a+ata.`);
  const { error } = await supabase.rpc("record_sgsti_meeting_metadata", { target_occurrence_id: occurrenceId.data, target_started_at: startedAt.data ?? null, target_ended_at: endedAt.data ?? null, target_location: location.data ?? null, target_facilitator: facilitator.data ?? null, target_attendee_roles: attendeeRoles.data ?? null });
  if (error) redirect(`${path}?activity=${occurrenceId.data}&message=N%C3%A3o+foi+poss%C3%ADvel+salvar+os+dados+da+ata.`);
  revalidatePath(path); redirect(`${path}?activity=${occurrenceId.data}&message=Dados+estruturados+da+ata+salvos.`);
}
