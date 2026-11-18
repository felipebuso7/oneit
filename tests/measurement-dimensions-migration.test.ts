import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("dimensões e imutabilidade do BM", () => {
  const migration = readFileSync("supabase/migrations/20261118210000_measurement_dimensions.sql", "utf8");

  it("preserva as dimensões de segregação no snapshot da medição", () => {
    for (const column of ["competence", "customer_id", "contract_id", "location_id", "department_unit_id", "service_offering_id"]) {
      expect(migration).toContain(`add column if not exists ${column}`);
      expect(migration).toContain(column);
    }
    expect(migration).toContain("target_competence");
    expect(migration).toContain("jsonb_build_object('service_order_id'");
  });

  it("gera somente OS validadas/encerradas e mantém idempotência por competência", () => {
    expect(migration).toContain("so.status='VALIDATED'");
    expect(migration).toContain("t.administrative_status='CLOSED'");
    expect(migration).toContain("on conflict (organization_id, competence) do nothing");
    expect(migration).toContain("if sheet_record.id is not null then return sheet_record");
  });
});
