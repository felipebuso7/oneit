import { describe, expect, it } from "vitest";

import { createTicketSchema, ticketCommunicationSchema, ticketIdSchema, ticketTriageContextSchema } from "./ticket";

const id = "019cda50-f764-7a5e-9101-513020ce22e8";

describe("ticket intake validation", () => {
  it("accepts a sufficiently described classified ticket", () => {
    expect(createTicketSchema.safeParse({ organizationId: id, customerId: id, contractId: id, serviceOfferingId: id, locationId: id, ticketType: "INCIDENT", title: "Falha de conectividade", description: "Usuário sem acesso à rede corporativa desde esta manhã.", impact: "HIGH", urgency: "MEDIUM" }).success).toBe(true);
  });

  it("does not accept an untraceable short ticket", () => {
    expect(createTicketSchema.safeParse({ organizationId: id, customerId: id, locationId: id, ticketType: "INCIDENT", title: "Erro", description: "Curta", impact: "LOW", urgency: "LOW" }).success).toBe(false);
  });
});

describe("ticket triage and communication", () => {
  it("accepts a classified requester context and valid communication", () => {
    expect(ticketTriageContextSchema.safeParse({ ticketId: id, requesterCollaboratorId: id, departmentUnitId: id, serviceOfferingId: id }).success).toBe(true);
    expect(ticketCommunicationSchema.safeParse({ ticketId: id, audience: "CUSTOMER", message: "Seu chamado está em análise." }).success).toBe(true);
  });
});

describe("first attendance marker", () => it("requires a valid ticket identifier", () => {
  expect(ticketIdSchema.safeParse({ ticketId: id }).success).toBe(true);
  expect(ticketIdSchema.safeParse({ ticketId: "not-an-id" }).success).toBe(false);
}));
