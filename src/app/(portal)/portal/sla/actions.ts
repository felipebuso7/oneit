"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { serviceLevelPolicySchema } from "@/lib/validation/service-level";
import { serviceLevelPauseSchema } from "@/lib/validation/service-level-pause";
export async function saveServiceLevelPolicy(formData: FormData) {
  const simpleName = String(formData.get("name") ?? "").trim();
  const simpleDuration = Number(formData.get("durationValue"));
  const simpleUnit = String(formData.get("durationUnit") ?? "");
  const simpleId = String(formData.get("policyId") ?? "");
  if (simpleName && Number.isInteger(simpleDuration) && simpleDuration > 0 && ["MINUTES", "HOURS", "DAYS"].includes(simpleUnit)) {
    const { supabase, user } = await requireUser();
    const minutes = simpleDuration * (simpleUnit === "HOURS" ? 60 : simpleUnit === "DAYS" ? 1440 : 1);
    const { data: role } = await supabase.from("user_roles").select("organization_id").eq("user_id", user.id).in("role", ["ORG_ADMIN", "SUPER_ADMIN"]).limit(1).maybeSingle();
    const { data: contract } = role?.organization_id ? await supabase.from("contracts").select("id,organization_id").eq("organization_id", role.organization_id).eq("active", true).order("created_at").limit(1).maybeSingle() : { data: null };
    if (!contract) redirect("/portal/sla?message=Cadastre+um+contrato+ativo+antes+de+criar+um+SLA.");
    const payload = { organization_id: contract.organization_id, contract_id: contract.id, name: simpleName, duration_value: simpleDuration, duration_unit: simpleUnit, response_minutes: minutes, resolution_minutes: minutes, ola_minutes: minutes, priority: 3, active: formData.get("active") !== "false" };
    const result = simpleId ? await supabase.from("service_level_policies").update(payload).eq("id", simpleId).select("id").maybeSingle() : await supabase.from("service_level_policies").insert(payload).select("id").single();
    if (result.error || !result.data) redirect(`/portal/sla?message=${encodeURIComponent("Não foi possível salvar o SLA.")}`);
    revalidatePath("/portal/sla"); redirect(`/portal/sla?message=${encodeURIComponent(simpleId ? "SLA atualizado." : "SLA cadastrado.")}`);
  }
  const parsed = serviceLevelPolicySchema.safeParse({ contractId: formData.get("contractId"), serviceOfferingId: formData.get("serviceOfferingId") || undefined, calendarId: formData.get("calendarId") || undefined, priority: formData.get("priority"), responseMinutes: formData.get("responseMinutes"), resolutionMinutes: formData.get("resolutionMinutes"), olaMinutes: formData.get("olaMinutes") });
  if (!parsed.success) redirect("/portal/sla?message=Política+inválida.");
  const { supabase } = await requireUser(); const value = parsed.data;
  const { data: contract, error: contractError } = await supabase.from("contracts").select("organization_id").eq("id", value.contractId).single();
  if (contractError || !contract) redirect("/portal/sla?message=Contrato+indisponível.");
  if (value.serviceOfferingId) {
    const { data: offering } = await supabase.from("service_offerings").select("id").eq("id", value.serviceOfferingId).single();
    if (!offering) redirect("/portal/sla?message=Oferta+de+serviço+indisponível+para+esta+organização.");
  }
  let existingQuery = supabase.from("service_level_policies").select("id").eq("contract_id", value.contractId).eq("priority", value.priority);
  existingQuery = value.serviceOfferingId ? existingQuery.eq("service_offering_id", value.serviceOfferingId) : existingQuery.is("service_offering_id", null);
  const { data: existing } = await existingQuery.maybeSingle();
  const policy = { organization_id: contract.organization_id, contract_id: value.contractId, service_offering_id: value.serviceOfferingId ?? null, calendar_id: value.calendarId ?? null, priority: value.priority, response_minutes: value.responseMinutes, resolution_minutes: value.resolutionMinutes, ola_minutes: value.olaMinutes, active: true };
  if (existing) {
    const { data: updated, error } = await supabase.from("service_level_policies").update(policy).eq("id", existing.id).select("id").maybeSingle();
    if (error || !updated) redirect(`/portal/sla?message=${encodeURIComponent(error ? "Não foi possível atualizar a política." : "Política não encontrada ou sem permissão para edição.")}`);
  } else {
    const { error } = await supabase.from("service_level_policies").insert(policy);
    if (error) redirect("/portal/sla?message=Não+foi+possível+salvar+a+política.");
  }
  revalidatePath("/portal/sla"); redirect("/portal/sla?message=Política+salva.+Somente+novas+OS+recebem+este+snapshot.");
}

export async function deleteServiceLevelPolicy(formData: FormData) {
  const id = String(formData.get("policyId") ?? "");
  const { supabase } = await requireUser();
  const { error } = await supabase.from("service_level_policies").update({ active: false }).eq("id", id);
  if (error) redirect(`/portal/sla?message=${encodeURIComponent("Não foi possível desativar o SLA. Histórico preservado.")}`);
  revalidatePath("/portal/sla"); redirect("/portal/sla?message=SLA+desativado.");
}
export async function pauseServiceLevel(formData: FormData) {
  const parsed = serviceLevelPauseSchema.safeParse({ ticketId: formData.get("ticketId"), version: formData.get("version"), reason: formData.get("reason") });
  if (!parsed.success) redirect("/portal/dashboard?message=Motivo+de+pausa+inválido.");
  const { supabase } = await requireUser(); const value = parsed.data;
  const { error } = await supabase.rpc("pause_ticket_service_level", { target_ticket_id: value.ticketId, expected_version: value.version, target_reason: value.reason });
  if (error) redirect("/portal/dashboard?message=Não+foi+possível+pausar.+A+OS+pode+ter+sido+alterada+ou+não+ter+meta+ativa.");
  revalidatePath("/portal/dashboard"); redirect("/portal/dashboard?message=Prazo+pausado+com+auditoria.");
}
export async function resumeServiceLevel(formData: FormData) {
  const parsed = serviceLevelPauseSchema.safeParse({ ticketId: formData.get("ticketId"), version: formData.get("version"), reason: formData.get("reason") });
  if (!parsed.success) redirect("/portal/dashboard?message=Motivo+de+retomada+inválido.");
  const { supabase } = await requireUser(); const value = parsed.data;
  const { error } = await supabase.rpc("resume_ticket_service_level", { target_ticket_id: value.ticketId, expected_version: value.version, target_reason: value.reason });
  if (error) redirect("/portal/dashboard?message=Não+foi+possível+retomar.+Recarregue+a+OS.");
  revalidatePath("/portal/dashboard"); redirect("/portal/dashboard?message=Prazo+retomado+e+vencimentos+ajustados.");
}
