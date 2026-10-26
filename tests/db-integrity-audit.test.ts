import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20261024100000_db_integrity_audit.sql", "utf8");

describe("DBA integrity audit migration", () => {
  it("enforces organization consistency across field service relationships", () => {
    expect(migration).toContain("FIELD_SERVICE_CROSS_ORGANIZATION_REFERENCE");
    expect(migration).toContain("FIELD_STOP_ORDER_ORGANIZATION_MISMATCH");
    expect(migration).toContain("PARTNER_ACCESS_SUPPLIER_ORGANIZATION_MISMATCH");
    expect(migration).toContain("PARTNER_SUBMISSION_ORGANIZATION_MISMATCH");
  });
  it("adds operational indexes for partner access and submissions", () => {
    expect(migration).toContain("service_order_partner_submissions_access_created_idx");
    expect(migration).toContain("service_order_partner_access_active_idx");
  });

  it("protects tenant evidence payloads from oversized or invalid signature data", () => {
    const evidenceMigration = readFileSync("supabase/migrations/20261023162000_partner_submission_evidence.sql", "utf8");
    expect(evidenceMigration).toContain("service_order_partner_submissions_evidence_size_ck");
    expect(evidenceMigration).toContain("data:image/%;base64,%");
  });
});
