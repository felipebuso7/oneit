import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20261028161000_fix_remote_function_lint_errors.sql", "utf8");
const castMigration = readFileSync("supabase/migrations/20261028161100_fix_remaining_remote_lint_error.sql", "utf8");

describe("remote SQL lint fixes", () => {
  it("qualifies ambiguous Field Service and outbox references", () => {
    expect(migration).toContain("route_stop.sequence_number");
    expect(migration).toContain("select claimed.id,claimed.organization_id");
    expect(migration).toContain("claimed.id,claimed.attempts,'STARTED'");
    expect(migration).toContain("extensions.gen_random_bytes(24)");
  });

  it("uses enum casts for changed and objective statuses", () => {
    expect(castMigration).toContain("::public.change_status");
    expect(castMigration).toContain("'ACHIEVED'::public.service_objective_status");
  });
});
