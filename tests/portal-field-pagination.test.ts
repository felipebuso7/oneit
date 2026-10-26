import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("limites das filas operacionais do portal", () => {
  it("limita ordens e técnicos na fila de OS", () => {
    const source = readFileSync("src/app/(portal)/portal/service-orders/page.tsx", "utf8");
    expect(source).toContain('.limit(200)');
  });

  it("limita rotas, paradas e candidatos da tela de rotas", () => {
    const source = readFileSync("src/app/(portal)/portal/routes/page.tsx", "utf8");
    expect(source).toContain('.limit(200)');
    expect(source).toContain('.limit(500)');
    expect(source).toContain('.limit(1000)');
  });
});
