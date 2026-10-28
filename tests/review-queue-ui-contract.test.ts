import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/app/(portal)/portal/review/page.tsx", "utf8");

describe("fila de validação", () => {
  it("mantém atualização explícita e resumo operacional", () => {
    expect(source).toContain("Atualizar validação");
    expect(source).toContain("Resumo da validação");
    expect(source).toContain("Aguardando validação");
    expect(source).toContain("Devolvidas");
  });
});
