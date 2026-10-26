import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("proteção do encerramento de parceiro", () => {
  it("mantém a regra de aceite e evidência no banco, não apenas na tela", () => {
    const migration = readFileSync("supabase/migrations/20261024133000_partner_submission_completion_guard.sql", "utf8");
    expect(migration).toContain("PARTNER_SIGNATURE_REQUIRED");
    expect(migration).toContain("PARTNER_EVIDENCE_REQUIRED");
    expect(migration).toContain("PARTNER_SUBMISSION_REQUIRED");
    expect(migration).toContain("order_record.status <> 'IN_SERVICE'");
  });

  it("aceita na API somente assinatura PNG em data URL limitada", () => {
    const route = readFileSync("src/app/api/field-service/partner/event/route.ts", "utf8");
    expect(route).toContain("max(262144)");
    expect(route).toContain("data:image\\/png;base64");
  });
});
