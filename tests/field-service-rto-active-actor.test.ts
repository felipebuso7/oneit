import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("field service RTO active actor migration", () => {
  const source = readFileSync("supabase/migrations/20261025140000_field_service_rto_active_actor.sql", "utf8");

  it("requires an active profile to generate and register an RTO", () => {
    expect(source.match(/from public\.user_profiles where id = auth\.uid\(\) and active/g)?.length).toBe(2);
    expect(source).toContain("RTO_NOT_AUTHORIZED");
  });
});
