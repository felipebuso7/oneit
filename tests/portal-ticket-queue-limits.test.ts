import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("limites adicionais das filas de chamados", () => {
  it("limita a listagem geral de chamados", () => {
    const source = readFileSync("src/app/(portal)/portal/tickets/page.tsx", "utf8");
    expect(source).toContain('.limit(500)');
  });

  it("limita a fila de agendamento", () => {
    const source = readFileSync("src/app/(portal)/portal/scheduling/page.tsx", "utf8");
    expect(source).toContain('.limit(500)');
  });
});
