import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("field validation flow", () => {
  it("keeps the decision in the manager queue and offers ticket details", () => {
    const source = readFileSync("src/app/(portal)/portal/review/page.tsx", "utf8");
    expect(source).toContain("Fila de validação");
    expect(source).toContain("Aprovar OS");
    expect(source).toContain("Devolver para correção");
    expect(source).toContain("Validar RTO e encerrar chamado");
    expect(source).toContain("Adicionar item LPU");
    expect(source).not.toContain("localStorage");
  });
});
