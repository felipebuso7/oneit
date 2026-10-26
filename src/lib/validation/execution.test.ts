import { describe, it, expect } from "vitest";
import { executionSchema } from "./execution";

const record = { ticketId: "019cda50-f764-7a5e-9101-513020ce22e8", version: 1, faultDomain: "CABLING", diagnosis: "Conector danificado no ponto", solution: "Conector substituído e testado", answers: { TEST: true } };
describe("execution validation", () => {
  it("accepts partial checklist drafts with complete diagnosis", () => expect(executionSchema.safeParse({ ...record, answers: { TEST: false } }).success).toBe(true));
  it("rejects invalid diagnosis, answers and version", () => {
    expect(executionSchema.safeParse({ ...record, diagnosis: "" }).success).toBe(false);
    expect(executionSchema.safeParse({ ...record, answers: { TEST: "true" } }).success).toBe(false);
    expect(executionSchema.safeParse({ ...record, version: 0 }).success).toBe(false);
    expect(executionSchema.safeParse({ ...record, faultDomain: "UNKNOWN_VALUE" }).success).toBe(false);
  });
});
