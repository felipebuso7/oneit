import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("field service review concurrency migration", () => {
  const source = readFileSync("supabase/migrations/20261025130000_field_service_review_concurrency.sql", "utf8");

  it("only approves a completed OS in the same organization", () => {
    expect(source).toContain("organization_id = item.organization_id");
    expect(source).toContain("status = 'COMPLETED'");
    expect(source).toContain("FIELD_REVIEW_ORDER_NOT_COMPLETED");
  });

  it("guards the pending queue update against a concurrent decision", () => {
    expect(source).toContain("where id = item.id and status = 'PENDING'");
    expect(source).toContain("FIELD_REVIEW_CONCURRENT_UPDATE");
    expect(source).toContain("get diagnostics changed = row_count");
  });

  it("keeps a returned OS actionable for technical correction", () => {
    const source = readFileSync("supabase/migrations/20261025195000_field_service_review_return_to_correction.sql", "utf8");
    expect(source).toContain("target_decision not in ('APPROVE', 'RETURN')");
    expect(source).toContain("else");
    expect(source).toContain("set status = 'IN_SERVICE'");
    expect(source).toContain("GESTOR_REVIEW_RETURN");
    expect(source).toContain("FIELD_REVIEW_ORDER_NOT_COMPLETED");
  });
});
