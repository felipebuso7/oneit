import { describe, expect, it } from "vitest";
import { completionSchema, reviewSchema } from "./completion";
const base = { ticketId: "019cda50-f764-7a5e-9101-513020ce22e8", version: 1 };
describe("completion and review", () => {
  it("requires an explicit material declaration and justification when absent", () => {
    expect(completionSchema.safeParse({ ...base, materialsUsed: "NO" }).success).toBe(false);
    expect(completionSchema.safeParse({ ...base, materialsUsed: "NO", noMaterialReason: "Somente reconexão do ponto" }).success).toBe(true);
    expect(completionSchema.safeParse({ ...base, materialsUsed: "YES" }).success).toBe(true);
  });
  it("rejects unsupported decisions, blank reasons and invalid versions", () => {
    expect(reviewSchema.safeParse({ ...base, decision: "CLOSE", reason: "Motivo de revisão" }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...base, decision: "RETURN", reason: " " }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...base, version: 0, decision: "APPROVE", reason: "Serviço validado" }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...base, decision: "RETURN", reason: "Corrigir a evidência do teste" }).success).toBe(true);
  });
});
