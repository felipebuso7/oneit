import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("billing email idempotency", () => {
  it("deduplicates BM and fiscal queue entries", () => {
    const migration = readFileSync("supabase/migrations/20261024122000_billing_email_idempotency.sql", "utf8");
    const route = readFileSync("src/app/api/field-service/fiscal/queue-email/route.ts", "utf8");
    expect(migration).toContain("billing_email_log_idempotency_idx");
    expect(route).toContain("idempotencyKey");
    expect(route).toContain("duplicate: true");
    expect(route).toContain("spreadsheetUrl");
    expect(route).toContain("context:");
  });
});
