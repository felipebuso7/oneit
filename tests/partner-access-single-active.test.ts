import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("supabase/migrations/20261024110000_partner_access_single_active.sql", "utf8");

describe("partner access issuance", () => {
  it("revokes previous active links before issuing a new one", () => {
    expect(source).toContain("set revoked_at=clock_timestamp()");
    expect(source).toContain("revoked_at is null");
    expect(source).toContain("create_service_order_partner_access");
  });
});
