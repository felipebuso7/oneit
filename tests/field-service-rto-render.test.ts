import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { fieldServiceRtoSnapshotSchema, renderFieldServiceRtoPdf } from "../src/domain/reports/pdf";

describe("RTO Field Service", () => {
  it("renderiza A4 com LPU", async () => {
    const snapshot = fieldServiceRtoSnapshotSchema.parse({ service_order_id: "00000000-0000-4000-8000-000000000001", ticket_id: "00000000-0000-4000-8000-000000000002", order_number: "OS-001", status: "VALIDATED", execution_report: "Atendimento concluído.", evidence: [], lpu_lines: [{ code: "CABO", description: "Cabo", unit: "metro", quantity: 10, unit_price: 10, total: 100 }] });
    const pdf = await renderFieldServiceRtoPdf(snapshot);
    const document = await PDFDocument.load(pdf);
    expect(document.getTitle()).toContain("OS-001");
    expect(document.getPages()[0].getWidth()).toBeCloseTo(595.28, 1);
  });

  it("aceita materiais realmente utilizados no snapshot e gera o PDF", async () => {
    const snapshot = fieldServiceRtoSnapshotSchema.parse({
      service_order_id: "00000000-0000-4000-8000-000000000001",
      ticket_id: "00000000-0000-4000-8000-000000000002",
      order_number: "OS-002",
      status: "VALIDATED",
      evidence: [],
      materials_used: [{ code: "CAT6", name: "Cabo CAT6", unit: "m", quantity: 12.5 }],
    });
    expect(snapshot.materials_used).toEqual([{ code: "CAT6", name: "Cabo CAT6", unit: "m", quantity: 12.5 }]);
    const document = await PDFDocument.load(await renderFieldServiceRtoPdf(snapshot));
    expect(document.getPages().length).toBeGreaterThan(0);
  });

  it("explicita deslocamento pendente sem inventar quilometragem", async () => {
    const snapshot = fieldServiceRtoSnapshotSchema.parse({
      service_order_id: "00000000-0000-4000-8000-000000000001", ticket_id: "00000000-0000-4000-8000-000000000002", order_number: "OS-003", status: "VALIDATED",
      travel_calculation_status: "PENDING", distance_one_way_km: null, estimated_return_km: null, estimated_total_km: null,
    });
    const pdf = await renderFieldServiceRtoPdf(snapshot);
    expect(pdf.byteLength).toBeGreaterThan(0);
  });
});
