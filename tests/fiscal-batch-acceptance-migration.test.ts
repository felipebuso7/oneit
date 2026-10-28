import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20261028120000_defer_fiscal_batch_acceptance.sql", "utf8");

describe("aceitação do lote fiscal", () => {
  it("não marca BMs nem competência no momento de criar o lote", () => {
    const createBody = migration.split("create or replace function public.sync_fiscal_batch_after_email_acceptance")[0];
    expect(createBody).not.toContain("update public.measurement_sheets");
    expect(createBody).not.toContain("update public.billing_periods");
  });

  it("só promove o lote e seus BMs após e-mail fiscal SENT", () => {
    expect(migration).toContain("new.status = 'SENT'");
    expect(migration).toContain("new.email_type = 'FISCAL'");
    expect(migration).toContain("set status = 'SENT', sent_at = new.sent_at");
    expect(migration).toContain("set status = 'SENT_TO_TAX'");
    expect(migration).toContain("email_log_id");
  });
});
