import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("acesso aos destinatários financeiros", () => {
  it("restringe a listagem a perfis autorizados", () => {
    const source = readFileSync("src/app/api/field-service/fiscal/recipients/route.ts", "utf8");
    expect(source).toContain('from("user_roles")');
    expect(source).toContain('"FINANCE"');
    expect(source).toContain("RECIPIENTS_NOT_AUTHORIZED");
  });
});
