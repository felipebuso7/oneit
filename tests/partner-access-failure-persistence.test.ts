import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("persistência de tentativas inválidas do parceiro", () => {
  it("separa o incremento da transação que retorna o erro", () => {
    const migration = readFileSync("supabase/migrations/20261025210000_partner_access_failure_persistence.sql", "utf8");
    const route = readFileSync("src/app/api/field-service/partner/context/route.ts", "utf8");
    expect(migration).toContain("record_partner_access_failure");
    expect(migration).toContain("least(validation_count + 1, 5)");
    expect(route).toContain("record_partner_access_failure");
    expect(route).toContain("!message.includes(\"EXPIRED\")");
  });
});
