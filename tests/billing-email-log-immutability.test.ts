import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("billing email log immutability", () => {
  it("protects confirmed sends from update and delete", () => {
    const sql = readFileSync("supabase/migrations/20261024124000_billing_email_log_immutability.sql", "utf8");
    expect(sql).toContain("old.status = 'SENT'");
    expect(sql).toContain("billing_email_log_immutable");
    expect(sql).toContain("before update or delete");
  });
});
