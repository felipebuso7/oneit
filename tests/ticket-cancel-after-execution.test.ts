import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("safe ticket cancellation after execution", () => {
  const migration = readFileSync(
    "supabase/migrations/20261113120000_allow_safe_ticket_cancellation_after_execution.sql",
    "utf8",
  );

  it("keeps the operation logical and preserves operational history", () => {
    expect(migration).toContain("operational_status = 'CANCELLED'");
    expect(migration).toContain("'preserved_execution', true");
    expect(migration).toContain("insert into public.audit_logs");
  });

  it("blocks only administratively closed tickets at the database boundary", () => {
    expect(migration).toContain("ticket_row.administrative_status = 'CLOSED'");
    expect(migration).not.toContain("'TECHNICALLY_COMPLETED'");
    expect(migration).not.toContain("'TRAVEL_STARTED'");
  });
});
