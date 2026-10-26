import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("emissão de acesso externo de Field", () => {
  it("exige origem, autenticação e usa o RPC que invalida acessos anteriores", () => {
    const source = readFileSync("src/app/api/field-service/partner/access/route.ts", "utf8");
    expect(source).toContain("hasSameOrigin");
    expect(source).toContain("AUTH_REQUIRED");
    expect(source).toContain("create_service_order_partner_access");
    expect(source).toContain("validForMinutes");
  });
});
