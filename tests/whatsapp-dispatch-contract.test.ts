import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("src/app/demo/field-service/page.tsx", "utf8");

describe("comunicação WhatsApp no despacho", () => {
  it("mantém envio interno e coleta telefone para parceiro", () => {
    expect(source).toContain("Compartilhar WhatsApp");
    expect(source).toContain("WhatsApp do parceiro");
    expect(source).toContain("Informe o telefone para envio");
    expect(source).toContain("O telefone informado será usado somente para preparar a mensagem desta OS.");
    expect(source).toContain("number.length !== 10 && number.length !== 11");
    expect(source).toContain("phone: phone || selected.technicianPhone");
    expect(source).toContain("updateSelected({ technicianPhone: phone })");
  });
});
