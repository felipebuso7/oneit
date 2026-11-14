import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const actions = readFileSync("src/app/(portal)/portal/service-catalog/actions.ts", "utf8");
const page = readFileSync("src/app/(portal)/portal/service-catalog/page.tsx", "utf8");
const ticketsPage = readFileSync("src/app/(portal)/portal/tickets/page.tsx", "utf8");
const slaPage = readFileSync("src/app/(portal)/portal/sla/page.tsx", "utf8");
const migration = readFileSync("supabase/migrations/20261001343000_service_catalog_administration.sql", "utf8");
const foundation = readFileSync("supabase/migrations/20261001220000_service_catalog.sql", "utf8");

describe("catálogo autenticado", () => {
  it("mantém a administração no portal autenticado e sem persistência local/demo", () => {
    expect(actions).toContain('"use server"');
    expect(actions).toContain("requireUser()");
    expect(actions).toContain('from("service_categories")');
    expect(actions).toContain('from("service_subcategories")');
    expect(actions).toContain('from("service_offerings")');
    expect(actions).not.toContain("localStorage");
    expect(page).not.toContain("localStorage");
    expect(page).not.toContain("@/app/demo");
  });

  it("restringe a listagem administrativa aos vínculos organizacionais do administrador", () => {
    expect(page).toContain('from("user_roles")');
    expect(page).toContain('["ORG_ADMIN", "SUPER_ADMIN"]');
    expect(page).toContain('in("organization_id", ids)');
    expect(page).toContain('eq("active", true)');
  });

  it("usa somente itens ativos nos seletores que alimentam a abertura do chamado", () => {
    expect(page).toContain("activeCategories");
    expect(page).toContain("activeSubcategories");
    expect(page).toContain("item.active");
    expect(actions).toContain('revalidatePath("/portal/tickets")');
  });

  it("revalida abertura de chamados e SLA após criar ou editar", () => {
    expect(actions).toContain('revalidatePath("/portal/tickets")');
    expect(actions).toContain('revalidatePath("/portal/sla")');
    expect(actions).toContain("update_service_catalog_item");
  });

  it("expõe a manutenção de serviços no catálogo autenticado", () => {
    expect(page).toContain('tab=offerings');
    expect(page).toContain('action={createServiceOffering}');
    expect(page).toContain('kind="offering"');
    expect(actions).toContain('kind !== "offering"');
    expect(actions).toContain('from("service_offerings").delete()');
  });

  it("revalida o SLA também após manutenção de item existente", () => {
    const updateAction = actions.slice(actions.indexOf("export async function updateServiceCatalogItem"));
    expect(updateAction).toContain('revalidatePath("/portal/sla")');
  });

  it("usa inativação para preservar histórico e impede filhos ativos órfãos", () => {
    expect(page).toContain("a exclusão física não é permitida");
    expect(migration).toContain("SERVICE_CATALOG_ACTIVE_CHILDREN");
    expect(migration).toContain("SERVICE_CATALOG_NOT_FOUND");
  });

  it("valida o serviço ativo e a hierarquia antes de persistir um chamado", () => {
    expect(foundation).toContain("tickets_validate_service_offering");
    expect(foundation).toContain("TICKET_SERVICE_OFFERING_INVALID");
    expect(foundation).toContain("category.organization_id <> new.organization_id");
  });

  it("carrega o catálogo da abertura respeitando a hierarquia persistida", () => {
    expect(ticketsPage).toContain('in("category_id", categoryIds)');
    expect(ticketsPage).toContain('in("subcategory_id", subcategoryIds)');
    expect(ticketsPage).toContain('eq("active", true)');
    expect(ticketsPage).not.toContain('from("service_subcategories").select("id, category_id, name").eq("active", true)');
    expect(ticketsPage).not.toContain('from("service_offerings").select("id, subcategory_id, code, name").eq("active", true)');
  });

  it("restringe administração e SLA aos descendentes do catálogo organizacional", () => {
    expect(page).toContain('in("category_id", categoryIds)');
    expect(page).toContain('in("subcategory_id", subcategoryIds)');
    expect(slaPage).toContain('in("category_id", categoryIds)');
    expect(slaPage).toContain('in("subcategory_id", subcategoryIds)');
  });
});
