import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("supabase/migrations/20261024103000_measurement_actor_integrity.sql", "utf8");

describe("measurement transition actor integrity", () => {
  it("uses the authenticated session actor", () => {
    expect(source).toContain("effective_actor uuid := auth.uid()");
    expect(source).toContain("measurement_transition_auth_required");
    expect(source).toContain("measurement_transition_metadata_too_large");
    expect(source).toContain("effective_actor, target_metadata");
  });
});
