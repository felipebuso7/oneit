import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("field ticket closure", () => {
  it("requires an LPU in the linked field visit before final closure", () => {
    const source = readFileSync("src/app/demo/tickets/page.tsx", "utf8");
    expect(source).toContain("oneit.demo.field-visits.v1");
    expect(source).toContain("Aplique uma LPU na OS de Field Service");
    expect(source).toContain("aceite assinado do responsável");
    expect(source).toContain("Inclua foto(s) ou uma justificativa");
  });

  it("closes the Field OS only after the manager validation succeeds", () => {
    const source = readFileSync("src/app/demo/tickets/page.tsx", "utf8");
    expect(source).toContain('state: "Concluído"');
    expect(source).toContain("managerValidatedAt");
    expect(source).toContain("não foi possível sincronizar a OS de Field Service");
  });
});
