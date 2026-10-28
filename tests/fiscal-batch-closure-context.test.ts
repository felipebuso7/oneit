import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20261028123000_allow_fiscal_batch_closure_context.sql", "utf8");

describe("fechamento do BM enviado em lote fiscal", () => {
  it("aceita o log fiscal direto ou o lote confirmado", () => {
    expect(migration).toContain("log.measurement_sheet_id = target_sheet_id");
    expect(migration).toContain("log.fiscal_batch_id is not null");
    expect(migration).toContain("batch.status = 'SENT'");
    expect(migration).toContain("batch.organization_id = current_sheet.organization_id");
    expect(migration).toContain("target_sheet_id = any(batch.measurement_sheet_ids)");
  });

  it("continua exigindo confirmação real do e-mail", () => {
    expect(migration).toContain("log.status = 'SENT'");
    expect(migration).toContain("log.sent_at is not null");
    expect(migration).toContain("measurement_final_email_not_confirmed");
  });
});
