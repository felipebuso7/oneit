import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const flow = readFileSync("src/components/tickets/ticket-create-flow.tsx", "utf8");
const action = readFileSync("src/app/(portal)/portal/tickets/actions.ts", "utf8");
const validation = readFileSync("src/lib/validation/ticket.ts", "utf8");

describe("abertura de chamado", () => {
  it("mantém o fluxo catálogo → formulário e os vínculos dependentes", () => {
    expect(flow).toContain('setStep("catalog")');
    expect(flow).toContain('setStep("form")');
    expect(flow).toContain("customerLocations");
    expect(flow).toContain("customerContracts");
    expect(flow).toContain('name="requesterCollaboratorId"');
    expect(flow).toContain('name="departmentUnitId"');
    expect(flow).toContain('name="serviceOfferingId"');
    expect(flow).toContain("Salvar chamado");
  });

  it("valida e persiste pelo action do portal, sem armazenamento local", () => {
    expect(action).toContain("createTicketSchema.safeParse");
    expect(action).toContain('supabase.from("tickets").insert');
    expect(action).toContain('revalidatePath("/portal/tickets")');
    expect(action).toContain("createdTicket.ticket_number");
    expect(action).not.toContain("localStorage");
    expect(validation).toContain("organizationId: z.uuid()");
    expect(validation).toContain("customerId: z.uuid()");
    expect(validation).toContain("locationId: z.uuid()");
  });
});
