import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("retomada do atendimento do técnico", () => {
  it("reconstrói a etapa a partir do status persistido da OS", () => {
    const component = readFileSync("src/components/field-service/partner-execution-flow.tsx", "utf8");
    expect(component).toContain("stepFromOrderStatus");
    expect(component).toContain('status === "TRAVELING"');
    expect(component).toContain('status === "CHECKED_IN"');
    expect(component).toContain('status === "IN_SERVICE"');
    expect(component).toContain('status === "DISPATCHED" && accepted');
  });

  it("leva o status retornado pelo contexto seguro até a tela mobile", () => {
    const page = readFileSync("src/app/demo/field-service/partner/page.tsx", "utf8");
    expect(page).toContain("status: context.status");
    expect(page).toContain("accepted: context.partner_accepted");
    expect(page).toContain("expiresAt: context.access_expires_at");
  });

  it("isola o aceite e a validade ao acesso validado", () => {
    const migration = readFileSync("supabase/migrations/20261024135000_partner_access_progress.sql", "utf8");
    expect(migration).toContain("public.assert_partner_access(target_token, target_code)");
    expect(migration).toContain("event.details->>'partner_access_id' = access_record.id::text");
    expect(migration).toContain("access_record.expires_at");
  });
});
