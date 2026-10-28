import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const routes = ["summary", "orders", "csv", "reconciliation", "readiness"];

describe("acesso às subrotas do lote fiscal", () => {
  it("exige perfil financeiro em todas as leituras auxiliares", () => {
    for (const route of routes) {
      const source = readFileSync(`src/app/api/field-service/fiscal/batch/[id]/${route}/route.ts`, "utf8");
      expect(source).toContain('from("user_roles")');
      expect(source).toContain("FISCAL_BATCH_NOT_AUTHORIZED");
    }
  });
});
