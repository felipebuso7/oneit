import { describe, expect, it } from "vitest";
import { nonconformityActionPlanSchema, nonconformityWorkflowSchema } from "./nonconformity-workflow";

const id = "019cda50-f764-7a5e-9101-513020ce22e8";

describe("nonconformity workflow", () => {
  it("accepts valid workflow state and corrective action data", () => {
    expect(nonconformityWorkflowSchema.safeParse({ nonconformityId: id, status: "CORRECTION", immediateCorrection: "A evidência pendente foi registrada no chamado." }).success).toBe(true);
    expect(nonconformityActionPlanSchema.safeParse({ nonconformityId: id, description: "Revisar o procedimento de aprovação de mudanças.", priority: "2" }).success).toBe(true);
  });

  it("rejects invalid identifiers and priorities", () => {
    expect(nonconformityWorkflowSchema.safeParse({ nonconformityId: "x", status: "CLOSED" }).success).toBe(false);
    expect(nonconformityActionPlanSchema.safeParse({ nonconformityId: id, description: "Revisar o procedimento de aprovação de mudanças.", priority: "9" }).success).toBe(false);
  });
});
