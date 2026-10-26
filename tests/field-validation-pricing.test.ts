import { describe, expect, it } from "vitest";
import { pricePendingVisit } from "../src/lib/demo/field-validation-pricing";

describe("precificação na validação do Field", () => {
  const visits = [
    { id: "os-1", state: "Aguardando validação do gestor", quotedAmount: 0, lpuCode: "" },
    { id: "os-2", state: "Concluído", quotedAmount: 50, lpuCode: "LPU-ANTIGA" },
  ];

  it("aplica o preço da LPU somente à OS pendente", () => {
    const priced = pricePendingVisit(visits, "os-1", { code: "LPU-RED-001", description: "Visita técnica de rede", price: 220, active: true });
    expect(priced[0]).toMatchObject({ lpuCode: "LPU-RED-001", lpuDescription: "Visita técnica de rede", quotedAmount: 220 });
    expect(priced[1]).toEqual(visits[1]);
    expect(visits[0].quotedAmount).toBe(0);
  });

  it("bloqueia preço inativo e OS já concluída", () => {
    expect(() => pricePendingVisit(visits, "os-1", { code: "LPU-X", price: 10, active: false })).toThrow("INVALID_LPU");
    expect(() => pricePendingVisit(visits, "os-2", { code: "LPU-X", price: 10, active: true })).toThrow("VISIT_NOT_PENDING");
  });
});
