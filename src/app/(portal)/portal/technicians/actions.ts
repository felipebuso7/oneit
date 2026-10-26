"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/current-user";
import { technicianSchema } from "@/lib/validation/organization";

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
