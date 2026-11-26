import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("integridade financeira", () => {
  it("mantém preço e total da linha com precisão decimal no banco", () => {
    const source = readFileSync("supabase/migrations/20261023100000_billing_measurements.sql", "utf8");
    expect(source).toContain("unit_price numeric(14,2)");
    expect(source).toContain("total_price numeric(14,2) generated always as (round(quantity * unit_price, 2)) stored");
    expect(source).toContain("quantity numeric(12,3) not null check (quantity > 0)");
  });

  it("impede reprocessar lote fiscal enviado ou fechado", () => {
    const source = readFileSync("supabase/migrations/20261126220000_fiscal_batch_sent_immutability.sql", "utf8");
    expect(source).toContain("old.status in ('SENT','CLOSED')");
    expect(source).toContain("fiscal_batch_immutable");
  });
});
