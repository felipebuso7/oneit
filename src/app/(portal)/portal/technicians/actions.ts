"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/current-user";
import { technicianSchema } from "@/lib/validation/organization";
import { z } from "zod";

const technicianStatusSchema = z.object({
  technicianId: z.uuid(),
  organizationId: z.uuid(),
  status: z.enum(["AVAILABLE", "UNAVAILABLE", "BUSY", "OFFLINE", "VACATION"]),
});

export async function createTechnician(formData: FormData) {
  const parsed = technicianSchema.safeParse({
    organizationId: formData.get("organizationId"), fullName: formData.get("fullName"),
    email: formData.get("email") || undefined, phone: formData.get("phone") || undefined,
    employmentType: formData.get("employmentType"), baseCity: formData.get("baseCity") || undefined,
    primaryRegionId: formData.get("primaryRegionId") || undefined,
  });
  if (!parsed.success) redirect("/portal/technicians?message=Dados+do+técnico+inválidos.");

  const { supabase } = await requireUser();
  const { data: technician, error } = await supabase.from("technicians").insert({
    organization_id: parsed.data.organizationId, full_name: parsed.data.fullName, email: parsed.data.email,
    phone: parsed.data.phone, employment_type: parsed.data.employmentType, base_city: parsed.data.baseCity,
    primary_region_id: parsed.data.primaryRegionId,
  }).select("id,full_name,email,phone,employment_type,organization_id").single();
  if (error) redirect("/portal/technicians?message=Não+foi+possível+criar+o+técnico.");
  const fieldEmail = technician.email ?? `tecnico-${technician.id.slice(0, 8)}@oneit.local`;
  const fieldType = /parceir|extern/i.test(technician.employment_type) ? "partner" : "internal";
  const { error: fieldError } = await supabase.from("field_service_technicians").insert({
    organization_id: technician.organization_id, name: technician.full_name, email: fieldEmail,
    technician_type: fieldType, phone: technician.phone, operational_technician_id: technician.id,
  });
  if (fieldError) redirect("/portal/technicians?message=Técnico criado, mas não foi possível criar o vínculo automático com o Field Service. Use Sincronizar cadastros.");
  revalidatePath("/portal/technicians"); redirect("/portal/technicians?message=Técnico+cadastrado.");
}

export async function syncFieldServiceTechnicians(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  if (!z.uuid().safeParse(organizationId).success) redirect("/portal/technicians?message=Organização inválida.");
  const { supabase } = await requireUser();
  const [{ data: operational, error: operationalError }, { data: masters, error: masterError }] = await Promise.all([
    supabase.from("technicians").select("id,organization_id,full_name,email,phone,employment_type,active").eq("organization_id", organizationId).eq("active", true),
    supabase.from("field_service_technicians").select("id,email,operational_technician_id").eq("organization_id", organizationId),
  ]);
  if (operationalError || masterError) redirect("/portal/technicians?message=Não foi possível ler os cadastros para sincronização.");
  const byEmail = new Map((masters ?? []).map((master) => [master.email.toLowerCase(), master]));
  const linkedIds = new Set((masters ?? []).map((master) => master.operational_technician_id).filter(Boolean));
  let created = 0;
  let linked = 0;
  for (const technician of operational ?? []) {
    if (linkedIds.has(technician.id)) continue;
    const email = (technician.email ?? `tecnico-${technician.id.slice(0, 8)}@oneit.local`).toLowerCase();
    const existing = byEmail.get(email);
    if (existing) {
      const { error } = await supabase.from("field_service_technicians").update({ operational_technician_id: existing.operational_technician_id ?? technician.id, name: technician.full_name, email, phone: technician.phone ?? null, active: technician.active }).eq("id", existing.id).is("operational_technician_id", null);
      if (!error) linked += 1;
      continue;
    }
    const { error } = await supabase.from("field_service_technicians").insert({
      organization_id: technician.organization_id, name: technician.full_name, email,
      technician_type: /parceir|extern/i.test(technician.employment_type) ? "partner" : "internal",
      phone: technician.phone, operational_technician_id: technician.id,
    });
    if (!error) created += 1;
  }
  revalidatePath("/portal/technicians");
  revalidatePath("/portal/field-service");
  redirect(`/portal/technicians?message=${encodeURIComponent(`Sincronização concluída: ${created} cadastro(s) criado(s) e ${linked} vínculo(s) recuperado(s).`)}`);
}

export async function linkFieldServiceTechnician(formData: FormData) {
  const parsed = z.object({
    fieldServiceTechnicianId: z.uuid(),
    operationalTechnicianId: z.uuid(),
  }).safeParse({
    fieldServiceTechnicianId: formData.get("fieldServiceTechnicianId"),
    operationalTechnicianId: formData.get("operationalTechnicianId"),
  });
  if (!parsed.success) redirect("/portal/technicians?message=Vínculo+de+técnico+inválido.");

  const { supabase } = await requireUser();
  const { data: master, error: masterError } = await supabase.from("field_service_technicians")
    .select("id,organization_id").eq("id", parsed.data.fieldServiceTechnicianId).maybeSingle();
  if (masterError || !master) redirect("/portal/technicians?message=Cadastro+de+Field+Service+não+encontrado.");

  const { data: operational, error: operationalError } = await supabase.from("technicians")
    .select("id").eq("id", parsed.data.operationalTechnicianId).eq("organization_id", master.organization_id).maybeSingle();
  if (operationalError || !operational) redirect("/portal/technicians?message=O+técnico+operacional+deve+pertencer+à+mesma+organização.");

  const { error } = await supabase.from("field_service_technicians")
    .update({ operational_technician_id: operational.id })
    .eq("id", master.id).eq("organization_id", master.organization_id);
  if (error) redirect(error.code === "23505" ? "/portal/technicians?message=Esse+técnico+operacional+já+está+vinculado+a+outro+cadastro." : "/portal/technicians?message=Não+foi+possível+salvar+o+vínculo.");

  revalidatePath("/portal/technicians");
  revalidatePath("/portal/field-service");
  revalidatePath("/portal/scheduling");
  redirect("/portal/technicians?message=Técnico+vinculado+ao+Field+Service.");
}

export async function updateTechnicianStatus(formData: FormData) {
  const parsed = technicianStatusSchema.safeParse({
    technicianId: formData.get("technicianId"),
    organizationId: formData.get("organizationId"),
    status: formData.get("status"),
  });
  if (!parsed.success) redirect("/portal/technicians?message=Status+de+técnico+inválido.");

  const { supabase } = await requireUser();
  const { error } = await supabase.from("technicians")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.technicianId)
    .eq("organization_id", parsed.data.organizationId)
    .eq("active", true);
  if (error) redirect("/portal/technicians?message=Não+foi+possível+alterar+a+disponibilidade+do+técnico.");

  revalidatePath("/portal/technicians");
  revalidatePath("/portal/field-service");
  redirect(`/portal/technicians?message=${parsed.data.status === "AVAILABLE" ? "Técnico+habilitado+para+despacho." : "Disponibilidade+do+técnico+atualizada."}`);
}
