"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { locationContactSchema, locationSchema } from "@/lib/validation/organization";

export async function createLocation(formData: FormData) {
  const parsed = locationSchema.safeParse({ organizationId: formData.get("organizationId"), customerId: formData.get("customerId"), name: formData.get("name"), city: formData.get("city"), stateCode: formData.get("stateCode") || undefined, externalCode: formData.get("externalCode") || undefined, street: formData.get("street") || undefined, streetNumber: formData.get("streetNumber") || undefined });
  if (!parsed.success) redirect("/portal/locations?message=Dados+da+localidade+inválidos.");
  const { supabase } = await requireUser();
  const { error } = await supabase.from("customer_locations").insert({ organization_id: parsed.data.organizationId, customer_id: parsed.data.customerId, name: parsed.data.name, city: parsed.data.city, state_code: parsed.data.stateCode, external_code: parsed.data.externalCode, street: parsed.data.street, street_number: parsed.data.streetNumber });
  if (error) redirect("/portal/locations?message=Não+foi+possível+criar+a+localidade.");
  revalidatePath("/portal/locations"); redirect("/portal/locations?message=Localidade+cadastrada.");
}

export async function createLocationContact(formData: FormData) {
  const parsed = locationContactSchema.safeParse({ locationId: formData.get("locationId"), name: formData.get("name"), contactType: formData.get("contactType"), email: formData.get("email") || undefined, phone: formData.get("phone") || undefined });
  if (!parsed.success) redirect("/portal/locations?message=Dados+do+contato+inválidos.");
  const { supabase } = await requireUser();
  const { error } = await supabase.from("location_contacts").insert({ location_id: parsed.data.locationId, name: parsed.data.name, contact_type: parsed.data.contactType, email: parsed.data.email, phone: parsed.data.phone });
  if (error) redirect("/portal/locations?message=Não+foi+possível+criar+o+contato.");
  revalidatePath("/portal/locations"); redirect("/portal/locations?message=Contato+cadastrado.");
}
