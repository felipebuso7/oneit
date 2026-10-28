import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspace = readFileSync("src/app/(portal)/portal/field-service/dispatch-workspace.tsx", "utf8");
const page = readFileSync("src/app/(portal)/portal/field-service/page.tsx", "utf8");
const tickets = readFileSync("src/components/tickets/tickets-table.tsx", "utf8");
const caseFile = readFileSync("src/app/(portal)/portal/tickets/[id]/page.tsx", "utf8");
const publicPartner = readFileSync("src/app/field-service/partner/page.tsx", "utf8");
const securePartner = readFileSync("src/components/field-service/secure-partner-page.tsx", "utf8");
const dispatchApi = readFileSync("src/app/api/field-service/dispatch/route.ts", "utf8");

describe("despacho do portal", () => {
  it("exibe feedback de despacho e prepara WhatsApp com o contato do técnico", () => {
    expect(workspace).toContain("Despacho confirmado");
    expect(workspace).toContain("whatsappRecipient");
    expect(workspace).toContain("Agendar visita e encaminhar por WhatsApp");
    expect(workspace).not.toContain("Abrir WhatsApp com resumo");
    expect(workspace).toContain("Atualizar fila");
    expect(workspace).toContain("O despacho pode usar o técnico operacional ativo");
    expect(workspace).toContain("O OneIT não considera a mensagem enviada");
    expect(workspace).toContain("/api/field-service/partner/access");
    expect(workspace).toContain("/field-service/partner/access#token=");
    expect(workspace).toContain("isShareableAccessLink");
    expect(workspace).not.toContain("/portal/field-service`");
    expect(page).toContain("phone,mobile");
    expect(page).toContain("initialTicketId");
    expect(tickets).toContain("Atribuir visita");
    expect(tickets).toContain("/portal/field-service?ticket=");
    expect(tickets).toContain("Validar OS");
    expect(tickets).toContain("Aguardando validação");
    expect(caseFile).toContain("Atribuir visita");
    expect(caseFile).toContain("canDispatch");
    expect(caseFile).toContain("awaitingValidation");
    expect(caseFile).toContain("Validar OS");
    expect(caseFile).toContain("Aguardando validação");
    expect(publicPartner).not.toContain("/demo/");
    expect(publicPartner).toContain("SecurePartnerPage");
    expect(securePartner).toContain("/api/field-service/partner/context");
    expect(securePartner).toContain("sessionStorage");
    expect(securePartner).toContain("PartnerExecutionFlow");
    expect(dispatchApi).toContain("operationalTechnician");
    expect(dispatchApi).toContain("field_service_technicians");
    expect(dispatchApi).toContain("select(\"id, active\")");
    expect(dispatchApi).toContain("!technicianMapping.active");
    expect(dispatchApi).toContain("A missing mapping is a legacy-data condition");
    expect(dispatchApi).not.toContain("mappingInsertError");
  });
});
