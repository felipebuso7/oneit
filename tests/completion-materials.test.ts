import { describe, expect, it } from "vitest";
import { completionSchema } from "@/lib/validation/completion";

describe("declaração de materiais no encerramento técnico", () => {
  const base = { ticketId: "9b8ae93e-a362-4fd5-b181-d8298ec1f28c", version: 1 };

  it("aceita serviço apenas de mão de obra sem justificativa de material", () => {
    expect(completionSchema.safeParse({ ...base, materialsUsed: "NO" }).success).toBe(true);
  });

  it("continua exigindo que o técnico declare se houve consumo", () => {
    expect(completionSchema.safeParse(base).success).toBe(false);
  });
});
