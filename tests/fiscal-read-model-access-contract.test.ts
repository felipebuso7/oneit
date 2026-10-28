import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const routes = [
  ["audit", "FISCAL_AUDIT_NOT_AUTHORIZED"],
  ["contestations", "CONTESTATIONS_NOT_AUTHORIZED"],
  ["history", "FISCAL_HISTORY_NOT_AUTHORIZED"],
  ["email-log", "EMAIL_LOG_NOT_AUTHORIZED"],
] as const;

describe("acesso aos read models fiscais", () => {
  it("exige perfil financeiro ou de gestão", () => {
    for (const [route, denialCode] of routes) {
      const source = readFileSync(`src/app/api/field-service/fiscal/${route}/route.ts`, "utf8");
      expect(source).toContain('from("user_roles")');
      expect(source).toContain(denialCode);
    }
  });
});
