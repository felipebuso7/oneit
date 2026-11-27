import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const migration = readFileSync("supabase/migrations/20261127190000_central_sla_catalog_seed.sql", "utf8");
describe("catálogo central de SLA", () => {
  it("permite SLA sem contrato e possui carga inicial idempotente", () => {
    expect(migration).toContain("alter column contract_id drop not null");
    expect(migration).toContain("where not exists");
    expect((migration.match(/SLA /g) ?? []).length).toBeGreaterThanOrEqual(8);
  });
  it("preserva o snapshot e não recalcula chamados sem contrato", () => {
    expect(migration).toContain("if new.contract_id is null then return new");
    expect(migration).toContain("new.opened_at+make_interval");
  });
});
