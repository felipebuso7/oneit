"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { serviceCategorySchema, serviceOfferingSchema, serviceSubcategorySchema, updateServiceCatalogItemSchema } from "@/lib/validation/service-catalog";
async function persist(formData: FormData, kind: "category" | "subcategory" | "offering") {
  const input = { code: formData.get("code"), name: formData.get("name") };
  const { supabase } = await requireUser();
  let error;
  if (kind === "category") {
    const parsed = serviceCategorySchema.safeParse({ ...input, organizationId: formData.get("organizationId") }); if (!parsed.success) redirect("/portal/service-catalog?message=Dados+inválidos.");
    ({ error } = await supabase.from("service_categories").insert({ organization_id: parsed.data.organizationId, code: parsed.data.code, name: parsed.data.name }));
  } else if (kind === "subcategory") {
    const parsed = serviceSubcategorySchema.safeParse({ ...input, categoryId: formData.get("parentId") }); if (!parsed.success) redirect("/portal/service-catalog?message=Dados+inválidos.");
    ({ error } = await supabase.from("service_subcategories").insert({ category_id: parsed.data.categoryId, code: parsed.data.code, name: parsed.data.name }));
  } else {
    const parsed = serviceOfferingSchema.safeParse({ ...input, subcategoryId: formData.get("parentId") }); if (!parsed.success) redirect("/portal/service-catalog?message=Dados+inválidos.");
    ({ error } = await supabase.from("service_offerings").insert({ subcategory_id: parsed.data.subcategoryId, code: parsed.data.code, name: parsed.data.name }));
  }
  if (error) redirect("/portal/service-catalog?message=Não+foi+possível+salvar.+Verifique+permissão,+código+e+hierarquia.");
  // O catálogo é consumido pelo fluxo de abertura de chamados e por regras de
  // SLA. Invalide as telas dependentes para que um novo item apareça sem
  // exigir logout, hard refresh ou uma nova sessão.
  revalidatePath("/portal/service-catalog");
  revalidatePath("/portal/tickets");
  revalidatePath("/portal/sla");
  redirect("/portal/service-catalog?message=Catálogo+atualizado.");
}
export async function createServiceCategory(formData: FormData) { await persist(formData, "category"); }
export async function createServiceSubcategory(formData: FormData) { await persist(formData, "subcategory"); }
export async function createServiceOffering(formData: FormData) { await persist(formData, "offering"); }

export async function updateServiceCatalogItem(formData: FormData) {
  const parsed = updateServiceCatalogItemSchema.safeParse({ id: formData.get("id"), kind: formData.get("kind"), code: formData.get("code"), name: formData.get("name"), active: formData.get("active") });
  if (!parsed.success) redirect("/portal/service-catalog?message=Dados+inválidos+para+manutenção+do+catálogo.");
  const { supabase } = await requireUser();
  const value = parsed.data;
  const { error } = await supabase.rpc("update_service_catalog_item", { target_kind: value.kind, target_id: value.id, target_code: value.code, target_name: value.name, target_active: value.active });
  if (error) redirect("/portal/service-catalog?message=Não+foi+possível+atualizar.+Inative+primeiro+os+itens+filhos+ativos,+se+houver.");
  revalidatePath("/portal/service-catalog");
  revalidatePath("/portal/tickets");
  revalidatePath("/portal/sla");
  redirect("/portal/service-catalog?message=Catálogo+atualizado+com+auditoria.");
}
