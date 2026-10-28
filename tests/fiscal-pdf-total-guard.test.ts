import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("fiscal BM PDF total guard", () => {
  it("applies the same frozen-total check to the standard fiscal PDF", () => {
    const source = readFileSync("src/app/api/field-service/fiscal/batch/[id]/pdf/route.ts", "utf8");
    expect(source).toContain("billingTotalsMatch");
    expect(source).toContain('BILLING_TOTAL_MISMATCH');
    expect(source).toContain("const orderCount = new Set");
  });

  it("blocks the standard PDF when a persisted line is incomplete", () => {
    const source = readFileSync("src/app/api/field-service/fiscal/batch/[id]/pdf/route.ts", "utf8");
    expect(source).toContain("validateBillingLineReadiness");
    expect(source).toContain('BILLING_DOCUMENT_INCOMPLETE');
  });
});
