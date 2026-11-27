import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("integridade operacional entre chamado e OS", () => {
  it("possui trigger transacional para cancelar OS abertas quando o chamado é encerrado", () => {
    const sql = readFileSync("supabase/migrations/20261126240000_sync_cancelled_ticket_orders.sql", "utf8");
    expect(sql).toContain("sync_ticket_operational_closure");
    expect(sql).toContain("status not in ('COMPLETED', 'VALIDATED', 'CANCELLED')");
    expect(sql).toContain("tickets_sync_service_orders");
    expect(sql).toContain("service_order_events");
  });
});
