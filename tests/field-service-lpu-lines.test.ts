import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("composição LPU da OS de Field Service", () => {
  const source = readFileSync("supabase/migrations/20261025110000_field_service_order_lpu_lines.sql", "utf8");
  it("preserva snapshot de preço e unidade por OS", () => {
    expect(source).toContain("field_service_order_lpu_lines");
    expect(source).toContain("unit_price numeric(12,2)");
    expect(source).toContain("unique(service_order_id, lpu_code)");
    expect(source).toContain("valid_from <= current_date");
  });
  it("impede lançamento fora da etapa de conclusão e exige perfil de gestão", () => {
    expect(source).toContain("LPU_NOT_AUTHORIZED");
    expect(source).toContain("LPU_INVALID_ORDER_STATE");
    expect(source).toContain("order_record.status not in ('COMPLETED','VALIDATED')");
  });
});
