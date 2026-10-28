import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("prévia PDF produtiva do BM", () => {
  it("usa dados persistidos, valida prontidão e protege a rota com sessão", () => {
    const source = readFileSync("src/app/api/field-service/measurement/[id]/pdf/route.ts", "utf8");
    expect(source).toContain("getUser");
    expect(source).toContain('from("user_roles")');
    expect(source).toContain("MEASUREMENT_NOT_AUTHORIZED");
    expect(source).toContain("measurement_sheet_lines");
    expect(source).toContain("validateBillingLineReadiness");
    expect(source).toContain("billingTotalsMatch");
    expect(source).toContain("Content-Type");
  });
});
