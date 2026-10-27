import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("internal Field Service review contract", () => {
  it("keeps internal completions in the modern validation queue", () => {
    const page = readFileSync("src/app/(portal)/portal/review/page.tsx", "utf8");
    const migration = readFileSync("supabase/migrations/20261027200000_field_service_rto_internal_completion.sql", "utf8");

    expect(page).toContain('from("ticket_completions")');
    expect(page).toContain('from("ticket_execution_records")');
    expect(page).toContain("normalizedFieldSubmissions");
    expect(page).toContain('value="APPROVE" disabled={!submission}');
    expect(migration).toContain("INTERNAL_COMPLETION");
    expect(migration).toContain("RTO_DATA_INCOMPLETE");
  });

  it("allows only validated internal or partner evidence paths in RTO rendering", () => {
    const source = readFileSync("src/lib/reports/store-field-service-rto.ts", "utf8");
    expect(source).toContain("partnerPath");
    expect(source).toContain("internalPath");
    expect(source).toContain("report.ticket_id");
  });
});
