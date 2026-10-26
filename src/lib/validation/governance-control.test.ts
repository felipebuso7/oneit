import { describe, expect, it } from "vitest";
import { governanceControlSchema } from "./governance-control";

const id = "550e8400-e29b-41d4-a716-446655440000";

describe("governance control validation", () => {
  it("requires a framework reference, process and control objective", () => {
    expect(governanceControlSchema.safeParse({ organizationId: id, framework: "ISO_IEC_20000_1_2018", referenceCode: "8.2", processName: "Gestão de nível de serviço", controlObjective: "Monitorar metas e preservar evidências de desempenho." }).success).toBe(true);
    expect(governanceControlSchema.safeParse({ organizationId: id, framework: "COBIT", referenceCode: "", processName: "Gestão", controlObjective: "Curto" }).success).toBe(false);
  });
});
