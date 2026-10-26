import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const dispatchSource = readFileSync(resolve(root, "src/app/demo/field-service/dispatch/page.tsx"), "utf8");
const confirmationSource = readFileSync(resolve(root, "src/app/demo/field-service/dispatch/confirmed/page.tsx"), "utf8");

describe("despacho com comunicação ao técnico", () => {
  it("preserva o chamado ativo e a confirmação do despacho para o acesso mobile", () => {
    expect(dispatchSource).toContain('"oneit.demo.field-active-ticket"');
    expect(dispatchSource).toContain('"oneit.demo.field-last-dispatch.v1"');
    expect(dispatchSource).toContain('"/demo/field-service/dispatch/confirmed"');
  });

  it("compõe uma mensagem WhatsApp com dados operacionais e o link do técnico", () => {
    expect(confirmationSource).toContain("Nova visita atribuída");
    expect(confirmationSource).toContain("Acesse o link abaixo para iniciar o deslocamento");
    expect(confirmationSource).toContain("https://wa.me/");
    expect(confirmationSource).toContain("Celular do técnico");
    expect(confirmationSource).toContain("Gerar acesso seguro");
    expect(confirmationSource).toContain("/api/field-service/partner/access");
    expect(confirmationSource).toContain("/demo/field-service/partner/access");
    expect(confirmationSource).toContain('url.hash = `token=${encodeURIComponent(payload.access.token)}`');
    expect(confirmationSource).not.toContain('url.searchParams.set("code", payload.access.code)');
    expect(confirmationSource).toContain("Informe o código ao técnico separadamente");
    expect(confirmationSource).toContain("recordFieldCommunication");
    expect(confirmationSource).toContain("Mensagem preparada para envio");
    expect(confirmationSource).toContain("whatsappRecipient(phone)");
    expect(confirmationSource).toContain("Informe um celular válido com DDD");
    expect(confirmationSource).toContain("encodeURIComponent(message)");
  });
});
