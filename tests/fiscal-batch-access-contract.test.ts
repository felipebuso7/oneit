import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("acesso ao lote fiscal", () => {
  it("restringe o detalhe financeiro a perfis autorizados", () => {
    const source = readFileSync("src/app/api/field-service/fiscal/batch/[id]/route.ts", "utf8");
    expect(source).toContain('from("user_roles")');
    expect(source).toContain("FISCAL_BATCH_NOT_AUTHORIZED");
  });
});
