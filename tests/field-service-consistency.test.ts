import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("src/app/(portal)/portal/field-service/page.tsx", "utf8");
const migration = readFileSync("supabase/migrations/20261127133000_sync_cancelled_ticket_orders.sql", "utf8");

describe("consistência do agendamento", () => {
  it("remove OS sem chamado operacional ativo da fonte da fila", () => {
    expect(page).toContain('filter((ticket) => !["CANCELLED", "CLOSED"].includes(ticket.operational_status))');
    expect(page).toContain("activeTicketIds.has(order.ticket_id)");
  });
  it("sincroniza cancelamento do chamado com a OS", () => {
    expect(migration).toContain("tickets_sync_cancelled_service_orders");
    expect(migration).toContain("set status = 'CANCELLED'");
  });
});
