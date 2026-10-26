import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("field service review direct update protection", () => {
  const source = readFileSync("supabase/migrations/20261025160000_field_service_review_no_direct_update.sql", "utf8");

  it("removes the broad manager update policy", () => {
    expect(source).toContain("drop policy if exists \"managers update field service review queue\"");
    expect(source).toContain("revoke update on public.field_service_review_queue from authenticated");
  });
});
