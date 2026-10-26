"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { supportGroupSchema } from "@/lib/validation/support-groups";

export async function createSupportGroup(formData: FormData) {
  const parsed = supportGroupSchema.safeParse({ organizationId: formData.get("organizationId"), code: formData.get("code"), name: formData.get("name"), supportLevel: formData.get("supportLevel") });
  if (!parsed.success) redirect("/portal/support-groups?message=Dados+do+grupo+inválidos.");
  const { supabase } = await requireUser(); const value = parsed.data;
  const { error } = await supabase.rpc("create_support_group", { target_organization_id: value.organizationId, target_code: value.code, target_name: value.name, target_support_level: value.supportLevel });
  if (error) redirect("/portal/support-groups?message=Não+foi+possível+criar+o+grupo.");
  revalidatePath("/portal/support-groups"); redirect("/portal/support-groups?message=Grupo+de+suporte+criado.");
}
