import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("geração produtiva do BM a partir de Field Service", () => {
  it("usa fechamentos administrativos, LPU persistida e snapshot", () => {
    const source = readFileSync("supabase/migrations/20261028170000_generate_measurement_from_field_service.sql", "utf8");
    expect(source).toContain("field_service_ticket_closures");
    expect(source).toContain("field_service_order_lpu_lines");
    expect(source).toContain("measurement_sheet_versions");
    expect(source).toContain("measurement_sheet_events");
    expect(source).toContain("on conflict (organization_id, competence) do nothing");
    expect(source).toContain("join public.service_orders so on so.id = closure.service_order_id and so.status = 'VALIDATED'");
    expect(source).toContain("join public.tickets t on t.id = closure.ticket_id and t.administrative_status = 'CLOSED'");
  });

  it("expõe endpoint autenticado com competência mensal", () => {
    const source = readFileSync("src/app/api/field-service/measurement/generate/route.ts", "utf8");
    expect(source).toContain("generate_field_service_measurement");
    expect(source).toContain("AUTH_REQUIRED");
    expect(source).toContain("/^\\d{4}-\\d{2}-01$/");
  });
});
