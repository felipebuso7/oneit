import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20261028102000_ticket_service_order_reference_integrity.sql", "utf8");

describe("integridade de referências de chamados e OS", () => {
  it("protege o vínculo do técnico com a organização do chamado", () => {
    expect(migration).toContain("TICKET_TECHNICIAN_ORGANIZATION_MISMATCH");
    expect(migration).toContain("tickets_validate_technician_reference");
  });

  it("protege referências de OS para chamado, técnico, local, contrato e fornecedor", () => {
    expect(migration).toContain("SERVICE_ORDER_TICKET_ORGANIZATION_MISMATCH");
    expect(migration).toContain("SERVICE_ORDER_TECHNICIAN_ORGANIZATION_MISMATCH");
    expect(migration).toContain("SERVICE_ORDER_LOCATION_ORGANIZATION_MISMATCH");
    expect(migration).toContain("SERVICE_ORDER_CONTRACT_ORGANIZATION_MISMATCH");
    expect(migration).toContain("SERVICE_ORDER_SUPPLIER_ORGANIZATION_MISMATCH");
  });
});
