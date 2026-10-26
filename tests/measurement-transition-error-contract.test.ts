import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("contrato de erro do fechamento financeiro", () => {
  it("expõe causa específica quando o e-mail fiscal não foi confirmado", () => {
    const source = readFileSync("src/app/api/field-service/measurement/transition/route.ts", "utf8");
    expect(source).toContain("measurement_final_email_not_confirmed");
    expect(source).toContain("FINAL_EMAIL_NOT_CONFIRMED");
  });
});
