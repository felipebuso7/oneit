"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/current-user";
import { organizationSchema } from "@/lib/validation/organization";

export async function updateOrganization(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const parsed = organizationSchema.safeParse({
    legalName: formData.get("legalName"),
    displayName: formData.get("displayName"),
  });

  if (!parsed.success || !id) {
    redirect("/portal/organizations?message=Dados+da+organização+inválidos.");
  }

  const { supabase } = await requireUser();
  const { data: updated, error } = await supabase
    .from("organizations")
    .update({ legal_name: parsed.data.legalName, display_name: parsed.data.displayName })
    .eq("id", id).select("id").maybeSingle();

  if (error || !updated) redirect(`/portal/organizations?message=${encodeURIComponent(error ? "Não foi possível atualizar a organização." : "Organização não encontrada ou sem permissão para edição.")}`);

  revalidatePath("/portal/organizations");
  redirect("/portal/organizations?message=Organização+atualizada.");
}
