import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/app/demo/field-service/dispatch/page.tsx", "utf8");

describe("field dispatch workspace", () => {
  it("keeps the guided three-step flow and persists the visit", () => {
    expect(source).toContain("1 · Chamado e local");
    expect(source).toContain("2 · Técnico e disponibilidade");
    expect(source).toContain("3 · Confirmar");
    expect(source).toContain("oneit.demo.field-visits.v1");
    expect(source).toContain("Confirmar visita e despachar");
    expect(source).toContain("selectedPolo");
    expect(source).toContain("polo/endereço");
    expect(source).toContain("syncTicketToField");
    expect(source).toContain('fieldStatus: "Despachado"');
    expect(source).toContain("/api/field-service/dispatch");
    expect(source).toContain("operationalTechnicianId");
    expect(source).toContain("operationalLocationId");
    expect(source).toContain("SCHEDULE_CONFLICT");
    expect(source).toContain("storedTechnicians");
    expect(source).toContain("hasConflict ? 1 : 0");
    expect(source).toContain("sameRegion ? 0 : 1");
    expect(source).toContain("technicianCapacity");
    expect(source).toContain("Conflito de agenda:");
    expect(source).toContain("visita(s) planejada(s) nesta data");
  });
});
