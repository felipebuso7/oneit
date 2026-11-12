import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ticketFieldProgress } from "@/lib/field-service/ticket-progress";
import { loadTicketFieldProgress } from "@/lib/field-service/ticket-progress-query";

describe("ticket next step after field execution", () => {
  it("does not offer validation for a closed ticket", () => {
    expect(ticketFieldProgress("CLOSED", { id: "os", status: "VALIDATED" }, undefined)).toBeNull();
  });
  it("requires validation after checkout", () => {
    expect(ticketFieldProgress("AWAITING_TRIAGE", { id: "os", status: "COMPLETED" }, undefined)?.action).toBe("Validar OS");
  });
  it.each([undefined, { storage_path: null }, { storage_path: " " }])("requires a saved PDF, not only an RTO row (%s)", (report) => {
    expect(ticketFieldProgress("AWAITING_TRIAGE", { id: "os", status: "VALIDATED" }, report)?.action).toBe("Gerar RTO");
  });
  it("offers closure once the approved OS has a stored PDF", () => {
    expect(ticketFieldProgress("AWAITING_TRIAGE", { id: "os", status: "VALIDATED" }, { storage_path: "org/report.pdf" })?.action).toBe("Encerrar chamado");
  });
  it("does not treat scheduled work as finished", () => {
    expect(ticketFieldProgress("AWAITING_TRIAGE", { id: "os", status: "DISPATCHED" }, undefined)).toBeNull();
  });
});

function mockDb(orders: object[], reports: object[], error: object | null = null) {
  const from = vi.fn((table: string) => {
    const query = {
      select: vi.fn(() => query), in: vi.fn(() => query), order: vi.fn(() => query),
      range: vi.fn(async (start: number, end: number) => ({ data: (table === "service_orders" ? orders : reports).slice(start, end + 1), error })),
    };
    return query;
  });
  return { client: { from } as unknown as SupabaseClient, from };
}

describe("persisted field progress query", () => {
  it("uses the newest OS and newest RTO even when an old PDF exists", async () => {
    const { client } = mockDb(
      [{ id: "new", ticket_id: "t", status: "VALIDATED" }, { id: "old", ticket_id: "t", status: "VALIDATED" }],
      [{ service_order_id: "new", storage_path: null, report_version: 2 }, { service_order_id: "new", storage_path: "old.pdf", report_version: 1 }],
    );
    const result = await loadTicketFieldProgress(client, [{ id: "t", administrative_status: "AWAITING_TRIAGE" }]);
    expect(result.get("t")).toMatchObject({ orderId: "new", action: "Gerar RTO" });
  });
  it("does not inherit approval from a previous visit", async () => {
    const { client } = mockDb([{ id: "new", ticket_id: "t", status: "DISPATCHED" }, { id: "old", ticket_id: "t", status: "VALIDATED" }], []);
    expect((await loadTicketFieldProgress(client, [{ id: "t", administrative_status: "AWAITING_TRIAGE" }])).get("t")).toBeNull();
  });
  it("surfaces database failures instead of displaying a false scheduling action", async () => {
    const { client } = mockDb([], [], { message: "query failed" });
    await expect(loadTicketFieldProgress(client, [{ id: "t", administrative_status: "OPEN" }])).rejects.toThrow("Não foi possível consultar");
  });
  it("does not query without visible tickets", async () => {
    const { client, from } = mockDb([], []);
    expect((await loadTicketFieldProgress(client, [])).size).toBe(0);
    expect(from).not.toHaveBeenCalled();
  });
});
