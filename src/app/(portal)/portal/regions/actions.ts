"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { regionSchema } from "@/lib/validation/organization";
import { z } from "zod";

export async function createRegion(formData: FormData) {
  const parsed = regionSchema.safeParse({ organizationId: formData.get("organizationId"), name: formData.get("name"), stateCode: formData.get("stateCode") || undefined });
  if (!parsed.success) redirect("/portal/regions?message=Dados+da+região+inválidos.");
  const { supabase } = await requireUser();
  const { error } = await supabase.from("regions").insert({ organization_id: parsed.data.organizationId, name: parsed.data.name, state_code: parsed.data.stateCode });
  if (error) redirect("/portal/regions?message=Não+foi+possível+criar+a+região.");
  revalidatePath("/portal/regions"); redirect("/portal/regions?message=Região+criada.");
}

function parseRegion(formData: FormData) {
  return regionSchema.extend({ regionId: z.string().uuid() }).safeParse({
    regionId: formData.get("regionId"),
    organizationId: formData.get("organizationId"),
    name: formData.get("name"),
    stateCode: formData.get("stateCode") || undefined,
  });
}

export async function updateRegion(formData: FormData) {
  const parsed = parseRegion(formData);
  if (!parsed.success) redirect("/portal/regions?message=Dados+da+região+inválidos.");
  const { supabase } = await requireUser();
  const { error } = await supabase.from("regions").update({ name: parsed.data.name, state_code: parsed.data.stateCode }).eq("id", parsed.data.regionId).eq("organization_id", parsed.data.organizationId);
  if (error) redirect("/portal/regions?message=Não+foi+possível+salvar+a+região.");
  revalidatePath("/portal/regions");
  redirect("/portal/regions?message=Região+atualizada.");
}

export async function toggleRegionStatus(formData: FormData) {
  const regionId = formData.get("regionId");
  const organizationId = formData.get("organizationId");
  const active = formData.get("active") === "true";
  if (typeof regionId !== "string" || typeof organizationId !== "string") redirect("/portal/regions?message=Região+inválida.");
  const { supabase } = await requireUser();
  const { error } = await supabase.from("regions").update({ active: !active }).eq("id", regionId).eq("organization_id", organizationId);
  if (error) redirect("/portal/regions?message=Não+foi+possível+alterar+o+status.");
  revalidatePath("/portal/regions");
  redirect(`/portal/regions?message=${active ? "Região+desativada." : "Região+ativada."}`);
}

export async function deleteRegion(formData: FormData) {
  const regionId = formData.get("regionId");
  const organizationId = formData.get("organizationId");
  if (typeof regionId !== "string" || typeof organizationId !== "string") redirect("/portal/regions?message=Região+inválida.");
  const { supabase } = await requireUser();
  const [{ data: locations }, { data: technicians }] = await Promise.all([
    supabase.from("customer_locations").select("id").eq("region_id", regionId).limit(1),
    supabase.from("technicians").select("id").eq("primary_region_id", regionId).limit(1),
  ]);
  if ((locations?.length ?? 0) > 0 || (technicians?.length ?? 0) > 0) redirect("/portal/regions?message=Esta+região+está+vinculada+a+polos+ou+técnicos.+Desative-a+em+vez+de+excluir.");
  const { error } = await supabase.from("regions").delete().eq("id", regionId).eq("organization_id", organizationId);
  if (error) redirect("/portal/regions?message=Não+foi+possível+excluir+a+região.");
  revalidatePath("/portal/regions");
  redirect("/portal/regions?message=Região+excluída.");
}
