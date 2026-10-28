import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("BM readiness total guard", () => {
  it("exposes a total mismatch before PDF generation", () => {
    const source = readFileSync("src/app/api/field-service/fiscal/batch/[id]/readiness/route.ts", "utf8");
    expect(source).toContain("billingTotalsMatch");
    expect(source).toContain("totalMismatch");
    expect(source).toContain("ready: incomplete.length === 0 && !totalMismatch");
  });
});
