import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("redistribuição transacional de OS", () => {
  const migration = readFileSync("supabase/migrations/20261024140000_field_redispatch.sql", "utf8");
  it("restringe a operação, valida disponibilidade e mantém a mesma OS", () => {
    expect(migration).toContain("FIELD_REDISPATCH_NOT_AUTHORIZED");
    expect(migration).toContain("order_record.status <> 'TRIAGE'");
    expect(migration).toContain("FIELD_REDISPATCH_SCHEDULE_CONFLICT");
    expect(migration).toContain("FIELD_REDISPATCH_ROUTE_ALREADY_STARTED");
    expect(migration).not.toContain("insert into public.service_orders(");
  });
  it("registra a rota anterior e revoga o acesso anterior", () => {
    expect(migration).toContain("'previous_route_id',previous_stop.route_id");
    expect(migration).toContain("update public.service_order_partner_accesses set revoked_at");
    expect(migration).toContain("FIELD_REDISPATCHED");
  });
});
