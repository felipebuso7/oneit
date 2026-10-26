import { describe, expect, it } from "vitest";
import { isShareableAccessLink, whatsappRecipient } from "../src/lib/field-service/dispatch-sharing";

describe("compartilhamento de despacho", () => {
  it("normaliza números brasileiros com DDD e rejeita códigos internacionais inesperados", () => {
    expect(whatsappRecipient("(11) 99999-9999")).toBe("5511999999999");
    expect(whatsappRecipient("+55 11 99999-9999")).toBe("5511999999999");
    expect(whatsappRecipient("+1 234 567 890 123")).toBe("");
    expect(whatsappRecipient("1234")).toBe("");
  });

  it("rejeita localhost, loopback e endereços inválidos", () => {
    expect(isShareableAccessLink("http://localhost:3000/demo")).toBe(false);
    expect(isShareableAccessLink("http://127.0.0.1:3000/demo")).toBe(false);
    expect(isShareableAccessLink("http://[::1]:3000/demo")).toBe(false);
    expect(isShareableAccessLink("javascript:alert(1)")).toBe(false);
    expect(isShareableAccessLink("https://oneit.example/demo?token=abc")).toBe(true);
  });
});
