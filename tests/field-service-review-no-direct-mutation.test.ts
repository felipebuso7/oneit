import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("field service review direct mutation protection", () => {
  it("revokes insert and delete from authenticated users", () => {
    const source = readFileSync("supabase/migrations/20261025170000_field_service_review_no_direct_mutation.sql", "utf8");
    expect(source).toContain("revoke insert, delete on public.field_service_review_queue from authenticated");
  });
});
