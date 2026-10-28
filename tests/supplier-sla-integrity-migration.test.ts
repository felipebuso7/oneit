import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20261028100000_supplier_sla_action_integrity.sql", "utf8");

describe("integridade de ações de SLA de fornecedores", () => {
  it("valida organização do SLA, fornecedor e responsável no banco", () => {
    expect(migration).toContain("validate_supplier_sla_action_links");
    expect(migration).toContain("SUPPLIER_SLA_ACTION_SLA_ORGANIZATION_MISMATCH");
    expect(migration).toContain("SUPPLIER_SLA_ACTION_SUPPLIER_ORGANIZATION_MISMATCH");
    expect(migration).toContain("SUPPLIER_SLA_ACTION_OWNER_ORGANIZATION_MISMATCH");
    expect(migration).toContain("before insert or update of organization_id, sla_record_id, supplier_id, owner_id");
  });
});
