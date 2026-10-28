import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dispatch = readFileSync("supabase/migrations/20261028161000_fix_remote_function_lint_errors.sql", "utf8");
const partnerAccess = readFileSync("supabase/migrations/20261001347000_field_service_routes_partner_access.sql", "utf8");
const execution = readFileSync("supabase/migrations/20261001348000_partner_access_execution.sql", "utf8");
const review = readFileSync("supabase/migrations/20261025100000_field_service_review_queue.sql", "utf8");
const rto = readFileSync("supabase/migrations/20261027200000_field_service_rto_internal_completion.sql", "utf8");
const closure = readFileSync("supabase/migrations/20261027170000_field_service_ticket_closure.sql", "utf8");

describe("contrato ponta a ponta do Field Service", () => {
  it("mantém a sequência despacho → acesso externo → execução → validação", () => {
    expect(dispatch).toContain("dispatch_ticket_to_field");
    expect(dispatch).toContain("service_order_partner_accesses");
    expect(partnerAccess).toContain("service_order_partner_accesses");
    expect(execution).toContain("CHECK_IN");
    expect(execution).toContain("CHECK_OUT");
    expect(execution).toContain("status='COMPLETED'");
    expect(review).toContain("field_service_review_queue");
    expect(review).toContain("status public.field_service_review_status not null default 'PENDING'");
    expect(review).toContain("service_orders_enqueue_review");
  });

  it("exige RTO persistido antes do encerramento definitivo", () => {
    expect(rto).toContain("generate_field_service_rto");
    expect(rto).toContain("report_id");
    expect(closure).toContain("FIELD_CLOSURE_PDF_REQUIRED");
    expect(closure).toContain("FIELD_CLOSURE_REVIEW_REQUIRED");
    expect(closure).toContain("field_service_ticket_closures");
  });
});
