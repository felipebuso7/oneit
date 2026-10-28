import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fieldServiceRtoSnapshotSchema, renderFieldServiceRtoPdf } from "../src/domain/reports/pdf";

const ids = { service_order_id: "00000000-0000-4000-8000-000000000001", ticket_id: "00000000-0000-4000-8000-000000000002" };

describe("RTO operational durations", () => {
  it("keeps ticket lifecycle timestamps in the additive migration", () => {
    const migration = readFileSync("supabase/migrations/20261028163000_field_service_rto_duration_snapshot.sql", "utf8");
    expect(migration).toContain("'ticket_opened_at'");
    expect(migration).toContain("'ticket_closed_at'");
  });

  it("accepts ticket lifecycle timestamps in the immutable snapshot", () => {
    const snapshot = fieldServiceRtoSnapshotSchema.parse({ ...ids, order_number: "OS-001", status: "VALIDATED", ticket_opened_at: "2026-10-28T08:00:00Z", ticket_closed_at: "2026-10-28T12:30:00Z" });
    expect(snapshot.ticket_opened_at).toBe("2026-10-28T08:00:00Z");
  });

  it("renders the lifecycle timeline without failing when timestamps are absent", async () => {
    const snapshot = fieldServiceRtoSnapshotSchema.parse({ ...ids, order_number: "OS-001", status: "VALIDATED", execution_report: "Concluído." });
    const pdf = await renderFieldServiceRtoPdf(snapshot);
    expect(pdf.byteLength).toBeGreaterThan(0);
  });

  it("renders technician-entered symbols without aborting PDF generation", async () => {
    const snapshot = fieldServiceRtoSnapshotSchema.parse({
      ...ids,
      order_number: "OS-002",
      status: "VALIDATED",
      title: "Troca de RJ45 • sala técnica",
      execution_report: "Concluído ✓ — sem material adicional.",
      customer_signature_name: "João da Silva",
    });
    const pdf = await renderFieldServiceRtoPdf(snapshot);
    expect(pdf.byteLength).toBeGreaterThan(0);
  });
});
