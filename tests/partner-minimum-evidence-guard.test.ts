import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("regra de três evidências no atendimento parceiro", () => {
  it("mantém a exigência no submit e na verificação do checkout", () => {
    const migration = readFileSync("supabase/migrations/20261028161200_partner_minimum_three_evidence.sql", "utf8");
    expect(migration).toContain("jsonb_array_length(coalesce(target_evidence, '[]'::jsonb)) < 3");
    expect(migration).toContain("jsonb_array_length(coalesce(submission.evidence, '[]'::jsonb)) >= 3");
    expect(migration).toContain("PARTNER_EVIDENCE_REQUIRED");
  });
});
