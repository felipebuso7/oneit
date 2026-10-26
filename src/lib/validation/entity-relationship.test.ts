import { describe, expect, it } from "vitest";
import { ticketNumberRelationshipSchema, ticketRelationshipSchema } from "./entity-relationship";

describe("ticket relationship", () => it("allows only explicit types and distinct records", () => {
  const base = { organizationId: "019cda50-f764-7a5e-9101-513020ce22e8", sourceTicketId: "019cda50-f764-7a5e-9101-513020ce22e9", targetTicketId: "019cda50-f764-7a5e-9101-513020ce22f0", relationshipType: "CAUSED_BY", reason: "Relação confirmada na triagem." };
  expect(ticketRelationshipSchema.safeParse(base).success).toBe(true);
  expect(ticketRelationshipSchema.safeParse({ ...base, relationshipType: "UNKNOWN" }).success).toBe(false);
  expect(ticketRelationshipSchema.safeParse({ ...base, targetTicketId: base.sourceTicketId }).success).toBe(false);
}));
describe("ticket parent and conversation grouping", () => it("keeps mass-incident linking distinct from grouping imported conversations", () => {
  const base = { ticketId: "019cda50-f764-7a5e-9101-513020ce22e8", parentTicketNumber: "FSM-2026-000001", relationshipType: "MASS_INCIDENT_PARENT", reason: "Falha de rede em massa." };
  expect(ticketNumberRelationshipSchema.safeParse(base).success).toBe(true);
  expect(ticketNumberRelationshipSchema.safeParse({ ...base, relationshipType: "CONVERSATION_GROUPED" }).success).toBe(true);
  expect(ticketNumberRelationshipSchema.safeParse({ ...base, relationshipType: "RELATED_TO" }).success).toBe(false);
}));
