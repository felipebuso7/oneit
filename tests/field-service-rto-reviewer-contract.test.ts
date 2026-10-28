import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("RTO reviewer provenance", () => {
  it("resolves the validator from the report generator without broad profile reads", () => {
    const source = readFileSync("src/lib/reports/store-field-service-rto.ts", "utf8");
    expect(source).toContain("generated_by");
    expect(source).toContain('.from("user_profiles").select("full_name").eq("id", report.generated_by)');
    expect(source).toContain("reviewer_name: reviewer.full_name.trim()");
    expect(source).toContain('throw new Error("RTO_REVIEWER_UNAVAILABLE")');
  });
});
