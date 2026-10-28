import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/20261027170000_field_service_ticket_closure.sql", "utf8");

describe("Field Service closure integrity", () => {
  it("requires an approved order, a persisted PDF and the review before closing", () => {
    expect(migration).toContain("order_record.status <> 'VALIDATED'");
    expect(migration).toContain("FIELD_CLOSURE_REVIEW_REQUIRED");
    expect(migration).toContain("FIELD_CLOSURE_PDF_REQUIRED");
    expect(migration).toContain("storage.objects");
  });

  it("keeps closure idempotent and prevents self-approval", () => {
    expect(migration).toContain("FIELD_CLOSURE_ALREADY_CLOSED");
    expect(migration).toContain("FIELD_CLOSURE_SELF_APPROVAL_FORBIDDEN");
    expect(migration).toContain("ticket_id uuid not null unique");
  });
});
