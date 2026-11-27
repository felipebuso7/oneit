import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20261127143000_operational_integrity_audit.sql", "utf8");
describe("auditoria de integridade operacional", () => {
  it("detecta ordens ativas ligadas a chamados encerrados", () => {
    expect(migration).toContain("ACTIVE_ORDER_CANCELLED_TICKET");
    expect(migration).toContain("t.operational_status in ('CANCELLED','CLOSED')");
  });
  it("detecta paradas órfãs, inelegíveis e duplicadas", () => {
    expect(migration).toContain("ORPHAN_ROUTE_STOP");
    expect(migration).toContain("INELIGIBLE_ROUTE_STOP");
    expect(migration).toContain("DUPLICATE_ROUTE_ORDER");
  });
});
