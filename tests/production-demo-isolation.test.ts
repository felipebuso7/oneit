import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("isolamento da operação real", () => {
  it("não usa a página demo no acesso público do técnico", () => {
    const source = readFileSync("src/app/field-service/partner/access/page.tsx", "utf8");
    expect(source).not.toContain("@/app/demo/");
    expect(source).toContain("PartnerCodeGate");
  });

  it("não redireciona o portal de produção para dados locais demo", () => {
    const source = readFileSync("src/app/(portal)/layout.tsx", "utf8");
    expect(source).toContain('process.env.NODE_ENV !== "production"');
    expect(source).toContain('redirect("/login?error=environment")');
  });
});
