import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("billing final lock", () => {
  it("freezes BM composition after fiscal handoff", () => {
    const sql = readFileSync("supabase/migrations/20261024121000_billing_final_lock.sql", "utf8");
    expect(sql).toContain("SENT_TO_TAX");
    expect(sql).toContain("SENT_TO_BILLING");
    expect(sql).toContain("CLOSED");
    expect(sql).toContain("measurement_lines_locked_for_billing");
  });
});
