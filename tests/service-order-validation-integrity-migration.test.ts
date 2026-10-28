import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20261028104000_service_order_validation_integrity.sql", "utf8");

describe("integridade da validação da OS", () => {
  it("exige checkout e aprovação da fila antes de VALIDATED", () => {
    expect(migration).toContain("SERVICE_ORDER_VALIDATION_CHECKOUT_REQUIRED");
    expect(migration).toContain("SERVICE_ORDER_VALIDATION_REVIEW_REQUIRED");
    expect(migration).toContain("queue.status = 'APPROVED'");
    expect(migration).toContain("service_orders_validate_validation_state");
  });
});
