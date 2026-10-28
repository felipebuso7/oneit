import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspace = readFileSync("src/app/(portal)/portal/field-service/dispatch-workspace.tsx", "utf8");
const page = readFileSync("src/app/(portal)/portal/field-service/page.tsx", "utf8");

describe("despacho do portal", () => {
  it("exibe feedback de despacho e prepara WhatsApp com o contato do técnico", () => {
    expect(workspace).toContain("Despacho confirmado");
    expect(workspace).toContain("whatsappRecipient");
    expect(workspace).toContain("Abrir WhatsApp com resumo");
    expect(workspace).toContain("O OneIT não considera a mensagem enviada");
    expect(page).toContain("phone,mobile");
  });
});
