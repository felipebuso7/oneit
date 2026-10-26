import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const review = readFileSync("supabase/migrations/20261001130000_completion_review.sql", "utf8");
const report = readFileSync("supabase/migrations/20261001140000_reports.sql", "utf8");
const closure = readFileSync("supabase/migrations/20261001150000_administrative_closure.sql", "utf8");

describe("contrato do fluxo operacional", () => {
  it("exige conclusão técnica antes da revisão gerencial", () => {
    expect(review).toContain("operational_status <> 'TECHNICALLY_COMPLETED'");
    expect(review).toContain("administrative_status <> 'AWAITING_REVIEW'");
    expect(review).toContain("MANAGER_REVIEW");
  });

  it("exige aprovação e relatório antes do encerramento administrativo", () => {
    expect(report).toContain("REPORT_APPROVAL_REQUIRED");
    expect(closure).toContain("CLOSURE_INVALID_STATE");
    expect(closure).toContain("REPORT_GENERATED");
    expect(closure).toContain("ticket_closures");
  });
});
