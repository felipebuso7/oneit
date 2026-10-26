import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("field service review organization integrity", () => {
  const source = readFileSync("supabase/migrations/20261025150000_field_service_review_org_integrity.sql", "utf8");

  it("checks both parent entities before accepting a queue row", () => {
    expect(source).toContain("from public.service_orders where id = new.service_order_id");
    expect(source).toContain("from public.tickets where id = new.ticket_id");
    expect(source).toContain("FIELD_REVIEW_ORGANIZATION_MISMATCH");
  });

  it("enforces the check for inserts and relevant updates", () => {
    expect(source).toContain("before insert or update of organization_id, service_order_id, ticket_id");
    expect(source).toContain("field_service_review_org_integrity");
  });
});
