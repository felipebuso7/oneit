import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("referência ServiceNow do chamado", () => {
  it("permanece conectada entre validação, persistência, fila e dossiê", () => {
    const schema = readFileSync("src/lib/validation/ticket.ts", "utf8");
    const action = readFileSync("src/app/(portal)/portal/tickets/actions.ts", "utf8");
    const queue = readFileSync("src/app/(portal)/portal/tickets/page.tsx", "utf8");
    const dossier = readFileSync("src/app/(portal)/portal/tickets/[id]/page.tsx", "utf8");
    const component = readFileSync("src/components/tickets/ticket-create-flow.tsx", "utf8");

    expect(schema).toContain("servicenowNumber");
    expect(action).toContain("servicenow_number: parsed.data.servicenowNumber || null");
    expect(queue).toContain("servicenow_number");
    expect(dossier).toContain("servicenow_number");
    expect(component).toContain("name=\"servicenowNumber\"");
  });

  it("bloqueia o envio até que organização, cliente e localidade estejam definidos", () => {
    const component = readFileSync("src/components/tickets/ticket-create-flow.tsx", "utf8");
    expect(component).toContain("const [locationId, setLocationId] = useState(\"\");");
    expect(component).toContain("setLocationId(\"\")");
    expect(component).toContain("!organizationId || !offeringId || !customerId || !locationId");
    expect(component).toContain("Selecione a localidade");
  });
});
