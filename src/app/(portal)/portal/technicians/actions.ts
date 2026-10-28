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
  const { error } = await supabase.from("technicians").insert({
    organization_id: parsed.data.organizationId, full_name: parsed.data.fullName, email: parsed.data.email,
    phone: parsed.data.phone, employment_type: parsed.data.employmentType, base_city: parsed.data.baseCity,
    primary_region_id: parsed.data.primaryRegionId,
  });
  if (error) redirect("/portal/technicians?message=Não+foi+possível+criar+o+técnico.");
  revalidatePath("/portal/technicians"); redirect("/portal/technicians?message=Técnico+cadastrado.");
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
