"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/current-user";
import { contractSchema } from "@/lib/validation/organization";
import { z } from "zod";

export async function createContract(formData: FormData) {
  const parsed = contractSchema.safeParse({
    organizationId: formData.get("organizationId"), customerId: formData.get("customerId"),
    code: formData.get("code"), name: formData.get("name"), startsAt: formData.get("startsAt"), endsAt: formData.get("endsAt") || undefined, customerOwnerName: formData.get("customerOwnerName") || undefined, serviceHours: formData.get("serviceHours") || undefined, scopeSummary: formData.get("scopeSummary") || undefined, exclusionsSummary: formData.get("exclusionsSummary") || undefined, renewalAutomatic: formData.get("renewalAutomatic") === "true", renewalNoticeDays: formData.get("renewalNoticeDays") || undefined,
  });
  if (!parsed.success) redirect("/portal/contracts?message=Dados+do+contrato+inválidos.");

  const { supabase } = await requireUser();
  const { error } = await supabase.from("contracts").insert({
    organization_id: parsed.data.organizationId, customer_id: parsed.data.customerId, code: parsed.data.code,
    name: parsed.data.name, starts_at: parsed.data.startsAt.toISOString().slice(0, 10),
    ends_at: parsed.data.endsAt?.toISOString().slice(0, 10), status: "ACTIVE", customer_owner_name: parsed.data.customerOwnerName, service_hours: parsed.data.serviceHours, scope_summary: parsed.data.scopeSummary, exclusions_summary: parsed.data.exclusionsSummary, renewal_automatic: parsed.data.renewalAutomatic, renewal_notice_days: parsed.data.renewalNoticeDays,
  });
  if (error) redirect("/portal/contracts?message=Não+foi+possível+criar+o+contrato.");

  revalidatePath("/portal/contracts");
  redirect("/portal/contracts?message=Contrato+criado.");
}

export async function updateContract(formData: FormData) {
  const parsed = contractSchema.extend({ contractId: z.uuid() }).safeParse({ contractId: formData.get("contractId"), organizationId: formData.get("organizationId"), customerId: formData.get("customerId"), code: formData.get("code"), name: formData.get("name"), startsAt: formData.get("startsAt"), endsAt: formData.get("endsAt") || undefined, customerOwnerName: formData.get("customerOwnerName") || undefined, serviceHours: formData.get("serviceHours") || undefined, scopeSummary: formData.get("scopeSummary") || undefined, exclusionsSummary: formData.get("exclusionsSummary") || undefined, renewalAutomatic: formData.get("renewalAutomatic") === "true", renewalNoticeDays: formData.get("renewalNoticeDays") || undefined });
  if (!parsed.success) redirect("/portal/contracts?message=Dados+do+contrato+inválidos.");
  const { supabase } = await requireUser(); const value = parsed.data;
  const { error } = await supabase.rpc("update_contract", { target_contract_id: value.contractId, target_code: value.code, target_name: value.name, target_starts_at: value.startsAt.toISOString().slice(0, 10), target_ends_at: value.endsAt?.toISOString().slice(0, 10) ?? null, target_customer_owner_name: value.customerOwnerName ?? null, target_service_hours: value.serviceHours ?? null, target_scope_summary: value.scopeSummary ?? null, target_exclusions_summary: value.exclusionsSummary ?? null, target_renewal_automatic: value.renewalAutomatic, target_renewal_notice_days: value.renewalNoticeDays ?? null });
  if (error) redirect("/portal/contracts?message=Não+foi+possível+atualizar+o+contrato."); revalidatePath("/portal/contracts"); redirect("/portal/contracts?message=Contrato+atualizado.");
}

export async function archiveContract(formData: FormData) {
  const id = String(formData.get("contractId") ?? ""); if (!id) redirect("/portal/contracts?message=Contrato+inválido.");
  const { supabase } = await requireUser(); const { error } = await supabase.rpc("archive_contract", { target_contract_id: id });
  if (error) redirect("/portal/contracts?message=Não+foi+possível+inativar+o+contrato."); revalidatePath("/portal/contracts"); redirect("/portal/contracts?message=Contrato+inativado+com+histórico+preservado.");
}
