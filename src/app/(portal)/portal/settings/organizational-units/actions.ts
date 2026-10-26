"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/current-user";
import { organizationUnitSchema, updateOrganizationUnitSchema } from "@/lib/validation/collaborator-organization";

const path = "/portal/settings/organizational-units";

export async function createOrganizationalUnit(formData: FormData) {
  const parsed = organizationUnitSchema.safeParse({
    organizationId: formData.get("organizationId"),
    type: formData.get("type"),
    code: formData.get("code"),
    name: formData.get("name"),
  });

  if (!parsed.success) redirect(`${path}?message=Dados+da+unidade+organizacional+inv%C3%A1lidos.`);

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("create_organization_unit", {
    target_organization_id: parsed.data.organizationId,
    target_type: parsed.data.type,
    target_code: parsed.data.code,
    target_name: parsed.data.name,
  });

  if (error) redirect(`${path}?message=N%C3%A3o+foi+poss%C3%ADvel+criar+a+unidade.+Verifique+seu+perfil+e+o+c%C3%B3digo.`);

  revalidatePath(path);
  revalidatePath("/portal/collaborators");
  revalidatePath("/portal/assets");
  redirect(`${path}?message=Unidade+organizacional+criada+com+sucesso.`);
}

export async function updateOrganizationalUnit(formData: FormData) {
  const parsed = updateOrganizationUnitSchema.safeParse({
    organizationUnitId: formData.get("organizationUnitId"), code: formData.get("code"),
    name: formData.get("name"), active: formData.get("active"),
  });
  if (!parsed.success) redirect(`${path}?message=Dados+da+unidade+organizacional+inv%C3%A1lidos.`);

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("update_organization_unit", {
    target_unit_id: parsed.data.organizationUnitId, target_code: parsed.data.code,
    target_name: parsed.data.name, target_active: parsed.data.active,
  });
  if (error) redirect(`${path}?message=N%C3%A3o+foi+poss%C3%ADvel+atualizar+a+unidade.+Verifique+o+c%C3%B3digo+e+suas+permiss%C3%B5es.`);

  revalidatePath(path);
  revalidatePath("/portal/collaborators");
  revalidatePath("/portal/assets");
  redirect(`${path}?message=Unidade+organizacional+atualizada+com+sucesso.`);
}
