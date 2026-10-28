import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspace = readFileSync("src/app/(portal)/portal/field-service/dispatch-workspace.tsx", "utf8");
const page = readFileSync("src/app/(portal)/portal/field-service/page.tsx", "utf8");
const tickets = readFileSync("src/components/tickets/tickets-table.tsx", "utf8");
const caseFile = readFileSync("src/app/(portal)/portal/tickets/[id]/page.tsx", "utf8");

describe("despacho do portal", () => {
  it("exibe feedback de despacho e prepara WhatsApp com o contato do técnico", () => {
    expect(workspace).toContain("Despacho confirmado");
    expect(workspace).toContain("whatsappRecipient");
    expect(workspace).toContain("Abrir WhatsApp com resumo");
    expect(workspace).toContain("O OneIT não considera a mensagem enviada");
    expect(workspace).toContain("/api/field-service/partner/access");
    expect(workspace).toContain("/field-service/partner/access#token=");
    expect(page).toContain("phone,mobile");
    expect(page).toContain("initialTicketId");
    expect(tickets).toContain("Atribuir visita");
    expect(tickets).toContain("/portal/field-service?ticket=");
    expect(tickets).toContain("Validar OS");
    expect(caseFile).toContain("Atribuir visita");
    expect(caseFile).toContain("canDispatch");
  });
});
