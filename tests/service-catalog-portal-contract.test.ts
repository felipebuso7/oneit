import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const actions = readFileSync("src/app/(portal)/portal/service-catalog/actions.ts", "utf8");
const page = readFileSync("src/app/(portal)/portal/service-catalog/page.tsx", "utf8");
const migration = readFileSync("supabase/migrations/20261001343000_service_catalog_administration.sql", "utf8");
const foundation = readFileSync("supabase/migrations/20261001220000_service_catalog.sql", "utf8");

describe("catálogo autenticado", () => {
  it("revalida abertura de chamados e SLA após criar ou editar", () => {
    expect(actions).toContain('revalidatePath("/portal/tickets")');
    expect(actions).toContain('revalidatePath("/portal/sla")');
    expect(actions).toContain("update_service_catalog_item");
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
});
