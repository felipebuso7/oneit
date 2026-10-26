import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("field service review submission integrity", () => {
  const source = readFileSync("supabase/migrations/20261025180000_field_service_review_submission_integrity.sql", "utf8");

  it("resolves the submission through its partner access and checks its OS", () => {
    expect(source).toContain("service_order_partner_submissions ps");
    expect(source).toContain("service_order_partner_accesses pa");
    expect(source).toContain("submission_order is distinct from new.service_order_id");
  });
});
