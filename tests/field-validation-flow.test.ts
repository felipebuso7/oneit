import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("field validation flow", () => {
  it("keeps the decision in the manager queue and offers ticket details", () => {
    const source = readFileSync("src/app/demo/field-service/validation-v2/page.tsx", "utf8");
    expect(source).toContain("Validar RTO e encerrar chamado");
    expect(source).toContain("O chamado não está pendente de validação");
    expect(source).toContain("&tab=Resolução");
    expect(source).toContain("LPU a conferir");
  });
});
