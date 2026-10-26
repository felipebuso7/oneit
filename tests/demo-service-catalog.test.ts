import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const page = readFileSync("src/app/demo/settings/service-catalog/page.tsx", "utf8");
const sidebar = readFileSync("src/components/demo-sidebar.tsx", "utf8");

describe("catálogo de serviços demonstrativo", () => {
  it("expõe manutenção completa no menu de configurações", () => {
    expect(sidebar).toContain('href: "/demo/settings/service-catalog"');
    expect(page).toContain("Criar serviço");
    expect(page).toContain("Salvar alterações");
    expect(page).toContain("Desativar");
    expect(page).toContain("Ativar");
    expect(page).toContain("oneit.demo.settings.v1");
  });
});
