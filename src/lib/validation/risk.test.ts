import { describe, expect, it } from "vitest";
import { riskSchema, riskWorkflowSchema } from "./risk";
const id = "019cda50-f764-7a5e-9101-513020ce22e8";
describe("risk", () => { it("validates inherent and residual assessment fields", () => { expect(riskSchema.safeParse({ organizationId: id, title: "Indisponibilidade do serviço de rede", description: "Falha de equipamento sem redundância suficiente.", likelihood: "4", impact: "5" }).success).toBe(true); expect(riskWorkflowSchema.safeParse({ riskId: id, status: "ACCEPTED", residualLikelihood: "2", residualImpact: "3" }).success).toBe(true); }); });
