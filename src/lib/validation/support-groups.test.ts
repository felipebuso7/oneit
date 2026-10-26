import { describe, expect, it } from "vitest";
import { supportGroupSchema, ticketEscalationSchema } from "./support-groups";

describe("support groups and escalation", () => it("validates support levels and an auditable escalation reason", () => {
  const group = { organizationId: "019cda50-f764-7a5e-9101-513020ce22e8", code: "N2_NETWORK", name: "Rede N2", supportLevel: "2" };
  expect(supportGroupSchema.safeParse(group).success).toBe(true); expect(supportGroupSchema.safeParse({ ...group, supportLevel: "4" }).success).toBe(false);
  const escalation = { ticketId: "019cda50-f764-7a5e-9101-513020ce22e9", targetGroupId: "019cda50-f764-7a5e-9101-513020ce22f0", escalationType: "FUNCTIONAL", reason: "Necessita análise especializada de rede." };
  expect(ticketEscalationSchema.safeParse(escalation).success).toBe(true); expect(ticketEscalationSchema.safeParse({ ...escalation, reason: "curto" }).success).toBe(false);
}));
