import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("proteção de aprovação da OS", () => {
  const migration = readFileSync("supabase/migrations/20261028154000_field_service_review_submission_guard.sql", "utf8");
  const actions = readFileSync("src/app/(portal)/portal/review/actions.ts", "utf8");

  it("exige submissão parceira ou execução interna antes de aprovar", () => {
    expect(migration).toContain("FIELD_REVIEW_SUBMISSION_REQUIRED");
    expect(migration).toContain("ticket_completions completion");
    expect(migration).toContain("ticket_execution_records execution");
    expect(migration).toContain("before update of status");
  });

  it("traduz a falha para uma mensagem operacional", () => {
    expect(actions).toContain("FIELD_REVIEW_SUBMISSION_REQUIRED");
    expect(actions).toContain("Não é seguro aprovar esta OS");
  });
});
