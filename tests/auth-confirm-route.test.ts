import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = readFileSync("src/app/auth/confirm/route.ts", "utf8");

describe("confirmação de autenticação", () => {
  it("não redireciona como sucesso quando a troca do código falha", () => {
    expect(route).toContain("exchangeCodeForSession(code)");
    expect(route).toContain("if (error)");
    expect(route).toContain("/forgot-password");
    expect(route).toContain("O link expirou ou é inválido");
  });

  it("mantém o destino interno e rejeita URLs externas", () => {
    expect(route).toContain('requestedNext?.startsWith("/")');
    expect(route).toContain('!requestedNext.startsWith("//")');
  });
});
