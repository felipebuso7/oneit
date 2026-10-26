import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("acesso externo com código temporário", () => {
  it("exige o código antes de abrir o portal do técnico", () => {
    const source = readFileSync("src/app/demo/field-service/partner/access/page.tsx", "utf8");
    expect(source).toContain("Informe o código temporário enviado pelo gestor");
    expect(source).toContain("/^\\d{6}$/");
    expect(source).toContain("/api/field-service/partner/context");
    expect(source).toContain('sessionStorage.setItem("oneit.partner.access.v1"');
    expect(source).toContain('router.replace("/demo/field-service/partner")');
  });
});
