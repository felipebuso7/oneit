import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("fechamento financeiro com confirmação de envio", () => {
  it("exige e-mail fiscal SENT antes de fechar a medição", () => {
    const source = readFileSync("supabase/migrations/20261025200000_measurement_close_requires_sent_email.sql", "utf8");
    expect(source).toContain("measurement_final_email_not_confirmed");
    expect(source).toContain("email_type = 'FISCAL'");
    expect(source).toContain("status = 'SENT'");
    expect(source).toContain("sent_at is not null");
  });
});
