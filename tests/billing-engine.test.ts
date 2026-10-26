import { describe, expect, it } from "vitest";
import { buildBillingSummary } from "../src/lib/field-service/billing-engine";

describe("billing engine", () => {
  it("calcula macro e micro por competência sem misturar meses", () => {
    const summary = buildBillingSummary("2026-10", [
      { id: "os-1", ticket: "INC-1", title: "Rede", completedAt: "2026-10-10T10:00:00Z", servicePrice: 100, materials: [{ code: "RJ45", description: "Conector RJ45", quantity: 2, unitPrice: 3.5 }] },
      { id: "os-2", ticket: "INC-2", title: "Rede", completedAt: "2026-10-20T10:00:00Z", servicePrice: 80, materials: [{ code: "RJ45", description: "Conector RJ45", quantity: 1, unitPrice: 3.5 }] },
      { id: "os-3", ticket: "INC-3", title: "Rede", completedAt: "2026-11-01T10:00:00Z", servicePrice: 999 },
    ]);
    expect(summary.orders).toHaveLength(2);
    expect(summary.serviceTotal).toBe(180);
    expect(summary.materialTotal).toBe(10.5);
    expect(summary.total).toBe(190.5);
    expect(summary.lines).toHaveLength(4);
    expect(summary.macro.find((item) => item.code === "RJ45")?.quantity).toBe(3);
  });

  it("não inclui OS ainda não validadas no boletim", () => {
    const summary = buildBillingSummary("2026-10", [
      { id: "os-open", ticket: "INC-OPEN", title: "Em atendimento", completedAt: "2026-10-10T10:00:00Z", state: "Em atendimento", servicePrice: 100 },
      { id: "os-closed", ticket: "INC-CLOSED", title: "Concluída", completedAt: "2026-10-11T10:00:00Z", state: "Concluído", administrativeStatus: "CLOSED", servicePrice: 80 },
    ]);
    expect(summary.orders.map((order) => order.id)).toEqual(["os-closed"]);
    expect(summary.total).toBe(80);
  });

  it("cobra a composição aprovada sem repetir material de consumo já incluído", () => {
    const summary = buildBillingSummary("2026-10", [{
      id: "os-field-1", ticket: "REQ-0290", title: "Wi-Fi Oscilando", completedAt: "2026-10-25T19:24:00Z",
      state: "Concluído", lpuCode: "LPU-RED-001", lpuDescription: "Visita técnica de rede", servicePrice: 220,
      materials: [{ description: "RJ45 utilizado", quantity: 1, unitPrice: 0 }],
    }]);
    expect(summary.orders).toHaveLength(1);
    expect(summary.lines).toEqual([expect.objectContaining({ code: "LPU-RED-001", description: "Visita técnica de rede", kind: "SERVICE", total: 220 })]);
    expect(summary.materialTotal).toBe(0);
    expect(summary.total).toBe(220);
  });
});
