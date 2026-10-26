import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("supabase/migrations/20261023154000_contestation_resolution_transaction.sql", "utf8");

describe("transação de resolução fiscal", () => {
  it("bloqueia os registros e atualiza contestação e competência no mesmo RPC", () => {
    expect(source).toContain("resolve_measurement_contestation");
    expect(source).toContain("for update");
    expect(source).toContain("contestation_already_resolved");
    expect(source).toContain("billing_period_transition_conflict");
    expect(source).toContain("update public.measurement_contestations");
    expect(source).toContain("update public.billing_periods");
  });
});
