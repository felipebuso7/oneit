import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { advanceDemoBillingCycle, type DemoBillingCycle, type DemoCycleStatus } from "../src/lib/demo/billing-cycle";

const finance = readFileSync("src/app/demo/field-service/finance/page.tsx", "utf8");
const fiscal = readFileSync("src/app/demo/field-service/fiscal/page.tsx", "utf8");
const snapshot = { total: 220, orderCount: 1, at: "2026-10-25T19:30:00Z" };

describe("fluxo demonstrativo de BM e fiscal", () => {
  it("preserva as etapas sem registrar envio real ou bloqueio no servidor", () => {
    let cycle: DemoBillingCycle | null = null;
    for (const state of ["READY_FOR_REVIEW", "SENT_FOR_CONTESTATION", "APPROVED", "SENT_TO_TAX", "SENT_TO_BILLING", "CLOSED"] as DemoCycleStatus[]) {
      cycle = advanceDemoBillingCycle(cycle, state, snapshot);
    }
    expect(cycle).toMatchObject({ status: "CLOSED", total: 220, orderCount: 1, simulatedBmAt: snapshot.at, simulatedFiscalAt: snapshot.at });
    expect(cycle).not.toHaveProperty("emailSentAt");
    expect(cycle).not.toHaveProperty("finalEmailSentAt");
    expect(cycle).not.toHaveProperty("immutableAt");
    expect(finance).toContain("Simular envio do BM");
    expect(fiscal).toContain("Simular encerramento fiscal");
  });

  it("impede salto de etapa e reabertura de simulação encerrada", () => {
    expect(() => advanceDemoBillingCycle(null, "SENT_TO_TAX", snapshot)).toThrow("INVALID_DEMO_BILLING_TRANSITION");
    expect(() => advanceDemoBillingCycle({ status: "CLOSED" }, "READY_FOR_REVIEW", snapshot)).toThrow("INVALID_DEMO_BILLING_TRANSITION");
  });
});
