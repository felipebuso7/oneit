import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("aceite do técnico parceiro", () => {
  it("registra um aceite auditável sem antecipar o deslocamento", () => {
    const migration = readFileSync("supabase/migrations/20261024134000_partner_acceptance_event.sql", "utf8");
    expect(migration).toContain("'ACCEPTED'");
    expect(migration).toContain("accept_partner_service_order");
    expect(migration).toContain("PARTNER_ACCEPT_INVALID_STATE");
    expect(migration).not.toContain("update public.service_orders set status = 'TRAVELING'");
  });

  it("direciona o aceite a uma função específica da API", () => {
    const route = readFileSync("src/app/api/field-service/partner/event/route.ts", "utf8");
    expect(route).toContain('"ACCEPT"');
    expect(route).toContain("accept_partner_service_order");
  });
});
