import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20261028210000_field_service_order_lpu_compositions.sql", "utf8");
const action = readFileSync("src/app/(portal)/portal/review/actions.ts", "utf8");

describe("aplicação de composição LPU na OS", () => {
  it("expande itens, soma conflitos e preserva o preço congelado", () => {
    expect(migration).toContain("add_field_service_order_lpu_composition");
    expect(migration).toContain("line.quantity * target_quantity");
    expect(migration).toContain("public.field_service_order_lpu_lines.quantity + excluded.quantity");
    expect(migration).toContain("line.unit_price");
  });

  it("expõe a ação autenticada para lançar a composição", () => {
    expect(action).toContain("addFieldServiceOrderLpuComposition");
    expect(action).toContain("add_field_service_order_lpu_composition");
    expect(action).toContain("target_composition_id");
  });
});
