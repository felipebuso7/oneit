import { describe, expect, it } from "vitest";
import fs from "node:fs";

const migration = fs.readFileSync("supabase/migrations/20261023152000_billing_line_lock.sql", "utf8");

describe("proteção de composição financeira", () => {
  it("bloqueia alterações de linhas e resumo após envio fiscal ou fechamento", () => {
    expect(migration).toContain("period_status in ('SENT_TO_TAX', 'CLOSED')");
    expect(migration).toContain("measurement_lines_locked_for_fiscal");
    expect(migration).toContain("measurement_summary_locked_for_fiscal");
    expect(migration).toContain("before insert or update or delete on public.measurement_sheet_lines");
    expect(migration).toContain("before insert or update or delete on public.measurement_sheet_summary");
  });
});
