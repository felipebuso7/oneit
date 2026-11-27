import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20261117160000_master_test_ticket_cleanup.sql", "utf8");
const action = readFileSync("src/app/(portal)/portal/tickets/actions.ts", "utf8");

describe("cancelamento seguro de chamados", () => {
  it("permite retirar chamados recém-criados sem atendimento iniciado", () => {
    expect(migration).toContain("'NEW','TRIAGE','AWAITING_SCHEDULING'");
    expect(migration).toContain("update public.tickets set operational_status = 'CANCELLED'");
    expect(migration).toContain("update public.service_orders set status = 'CANCELLED'");
  });

  it("revalida todas as filas após o cancelamento", () => {
    expect(action).toContain('revalidatePath("/portal/tickets")');
    expect(action).toContain('revalidatePath("/portal/field-service")');
  });
});
