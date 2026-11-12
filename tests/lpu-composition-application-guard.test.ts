import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("supabase/migrations/20261030082000_guard_field_service_lpu_composition_application.sql", "utf8");

describe("trava de composição LPU por OS", () => {
  it("registra uma única aplicação por composição e OS", () => {
    expect(source).toContain("unique (service_order_id, composition_id)");
    expect(source).toContain("LPU_COMPOSITION_ALREADY_APPLIED");
  });

  it("impede duplicidade de itens já precificados", () => {
    expect(source).toContain("LPU_COMPOSITION_ITEM_ALREADY_PRICED");
    expect(source).toContain("target_quantity <> round(target_quantity, 3)");
  });
});
