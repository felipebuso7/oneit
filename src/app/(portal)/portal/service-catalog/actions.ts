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

export async function deleteServiceCatalogItem(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const kind = formData.get("kind");
  if (!id || (kind !== "category" && kind !== "subcategory" && kind !== "offering")) redirect("/portal/service-catalog?message=Item+inválido.");
  const { supabase } = await requireUser();
  // O catálogo é referenciado por chamados e histórico. A exclusão física é
  // bloqueada pelo banco; “Excluir” na interface significa retirar do catálogo
  // ativo, preservando a rastreabilidade. A mesma função transacional usada na
  // edição aplica autorização, hierarquia e auditoria.
  const table = kind === "category" ? "service_categories" : kind === "subcategory" ? "service_subcategories" : "service_offerings";
  const { data: item, error: readError } = await supabase.from(table).select("code,name,active").eq("id", id).maybeSingle();
  if (readError || !item) redirect("/portal/service-catalog?message=Item+não+encontrado+ou+sem+permissão.");
  if (!item.active) redirect("/portal/service-catalog?message=Este+item+já+está+inativo.");
  const { error } = await supabase.rpc("update_service_catalog_item", { target_kind: kind, target_id: id, target_code: item.code, target_name: item.name, target_active: false });
  if (error) {
    const message = error.message.includes("SERVICE_CATALOG_ACTIVE_CHILDREN")
      ? "Inative primeiro os itens filhos ativos para retirar este item do catálogo."
      : error.message.includes("SERVICE_CATALOG_NOT_AUTHORIZED")
        ? "Seu perfil não pode excluir itens deste catálogo."
        : "Não foi possível excluir o item. Ele pode estar em uso no histórico.";
    redirect(`/portal/service-catalog?message=${encodeURIComponent(message)}`);
  }
  revalidatePath("/portal/service-catalog");
  revalidatePath("/portal/tickets");
  redirect("/portal/service-catalog?message=Item+excluído.");
}
