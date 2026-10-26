import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("fila persistente de validação do Field Service", () => {
  const source = readFileSync("supabase/migrations/20261025100000_field_service_review_queue.sql", "utf8");

  it("enfileira uma OS concluída sem fabricar ticket_completion", () => {
    expect(source).toContain("field_service_review_queue");
    expect(source).toContain("new.status = 'COMPLETED'");
    expect(source).toContain("service_order_id uuid not null unique");
    expect(source).toContain("submission_id uuid references public.service_order_partner_submissions");
    expect(source).not.toContain("insert into public.ticket_completions");
  });

  it("mantém proteção por organização e permite devolução rastreável", () => {
    expect(source).toContain("has_organization_role(organization_id");
    expect(source).toContain("status public.field_service_review_status");
    expect(source).toContain("review_reason");
    expect(source).toContain("reviewed_at");
    expect(source).toContain("review_field_service_order");
    expect(source).toContain("FIELD_REVIEW_REASON_REQUIRED");
    expect(source).toContain("status = 'VALIDATED'");
    expect(source).toContain("for update");
  });
});
