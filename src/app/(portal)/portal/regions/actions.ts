"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { regionSchema } from "@/lib/validation/organization";

export async function createRegion(formData: FormData) {
  const parsed = regionSchema.safeParse({ organizationId: formData.get("organizationId"), name: formData.get("name"), stateCode: formData.get("stateCode") || undefined });
  if (!parsed.success) redirect("/portal/regions?message=Dados+da+região+inválidos.");
  const { supabase } = await requireUser();
  const { error } = await supabase.from("regions").insert({ organization_id: parsed.data.organizationId, name: parsed.data.name, state_code: parsed.data.stateCode });
  if (error) redirect("/portal/regions?message=Não+foi+possível+criar+a+região.");
  revalidatePath("/portal/regions"); redirect("/portal/regions?message=Região+criada.");
}
