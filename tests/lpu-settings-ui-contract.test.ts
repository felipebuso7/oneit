import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/app/(portal)/portal/settings/field-service/lpu/lpu-settings-client.tsx", "utf8");

describe("cadastro de LPU", () => {
  it("mantém itens inativos visíveis e permite reativá-los", () => {
    expect(source).toContain("visibleItems.length ?");
    expect(source).toContain('item.active ? "Desativar" : "Reativar"');
    expect(source).toContain('active: true');
  });
});
