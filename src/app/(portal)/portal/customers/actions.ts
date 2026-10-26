"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/current-user";
import { customerSchema } from "@/lib/validation/organization";

export async function createCustomer(formData: FormData) {
  const parsed = customerSchema.safeParse({
    organizationId: formData.get("organizationId"),
    name: formData.get("name"),
    externalCode: formData.get("externalCode") || undefined,
  });

  if (!parsed.success) {
    redirect("/portal/customers?message=Dados+do+cliente+inválidos.");
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.from("customers").insert({
    organization_id: parsed.data.organizationId,
    name: parsed.data.name,
    external_code: parsed.data.externalCode,
  });

  if (error) {
    redirect("/portal/customers?message=Não+foi+possível+criar+o+cliente.");
  }

  revalidatePath("/portal/customers");
  redirect("/portal/customers?message=Cliente+criado.");
}
