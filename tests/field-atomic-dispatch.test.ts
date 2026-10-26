import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("despacho transacional de Field", () => {
  it("cria OS, rota, parada, histórico e auditoria no mesmo comando", () => {
    const migration = readFileSync("supabase/migrations/20261024131000_atomic_field_dispatch.sql", "utf8");
    expect(migration).toContain("dispatch_ticket_to_field");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("FIELD_DISPATCH_SCHEDULE_CONFLICT");
    expect(migration).toContain("field_service_route_stops");
    expect(migration).toContain("ticket_status_history");
    expect(migration).toContain("operational_status = 'ASSIGNED'");
    expect(migration).toContain("version = version + 1");
    expect(migration).toContain("FIELD_DISPATCH_ORDER_ALREADY_EXISTS");
    expect(migration).not.toContain("where route_id = route_id");
  });

  it("expõe conflitos e referências inválidas como respostas operacionais", () => {
    const api = readFileSync("src/app/api/field-service/dispatch/route.ts", "utf8");
    expect(api).toContain("SCHEDULE_CONFLICT");
    expect(api).toContain("DISPATCH_REFERENCE_INVALID");
    expect(api).toContain("DISPATCH_STATE_CONFLICT");
    expect(api).toContain("hasSameOrigin");
  });
});
