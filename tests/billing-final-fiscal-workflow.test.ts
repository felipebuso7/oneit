import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20261024120000_billing_final_fiscal_workflow.sql", "utf8");
const route = readFileSync("src/app/api/field-service/measurement/transition/route.ts", "utf8");

describe("production BM fiscal workflow", () => {
  it("supports correction, billing handoff and immutable final closure", () => {
    expect(migration).toContain("RETURNED_FOR_CORRECTION");
    expect(migration).toContain("SENT_TO_BILLING");
    expect(migration).toContain("final_email_sent_at");
    expect(migration).toContain("period_status = 'SENT_TO_BILLING' and target_status = 'CLOSED'");
  });

  it("exposes the new transitions through the authenticated API", () => {
    expect(route).toContain("RETURNED_FOR_CORRECTION");
    expect(route).toContain("SENT_TO_BILLING");
  });
});
