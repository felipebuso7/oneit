import { describe, expect, it } from "vitest";
import { sgstiInitiativeSchema, sgstiTaskExecutionSchema } from "./sgsti-master-plan";

const id = "550e8400-e29b-41d4-a716-446655440000";

describe("SGSTI master plan validation", () => {
  it("requires initiative codes and ISO references", () => {
    expect(sgstiInitiativeSchema.safeParse({ organizationId: id, code: "MEL-02", title: "Integridade do SLA e status pendente", priority: "CRITICAL", isoReferences: ["8.3.3", "9.1"] }).success).toBe(true);
    expect(sgstiInitiativeSchema.safeParse({ organizationId: id, code: "SLA-02", title: "Integridade do SLA e status pendente", priority: "CRITICAL", isoReferences: [] }).success).toBe(false);
  });

  it("does not allow a task to be completed without execution and evidence", () => {
    expect(sgstiTaskExecutionSchema.safeParse({ taskId: id, status: "COMPLETED" }).success).toBe(false);
    expect(sgstiTaskExecutionSchema.safeParse({ taskId: id, status: "COMPLETED", executionSummary: "A regra foi configurada e testada em uma amostra de chamados.", evidenceIds: [id] }).success).toBe(true);
  });
});
