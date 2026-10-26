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
});
