import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/demo-sidebar.tsx", "utf8");

describe("navegação modular do OneIT", () => {
  it("mantém faturamento como módulo separado", () => {
    expect(source).toContain('label: "Faturamento"');
    expect(source).toContain('module: "FISCAL"');
    expect(source).toContain('label: "BM e faturamento"');
    expect(source).toContain('label: "Lote fiscal"');
  });

  it("mantém administração separada da operação", () => {
    expect(source).toContain('label: "Administração"');
    expect(source).toContain('label: "Configurações"');
    expect(source).toContain('group: "Administração"');
  });

  it("mantém o Dashboard como entrada própria acima da Operação", () => {
    expect(source).toContain('{ id: "dashboard", label: "Dashboard"');
    expect(source).toContain('itemIds: ["overview"]');
    expect(source).toContain('item.id !== "overview"');
  });

  it("expõe permissões financeiras na matriz de usuários", () => {
    const usersSource = readFileSync("src/app/demo/technicians/page.tsx", "utf8");
    expect(usersSource).toContain('key: "FISCAL_VIEW"');
    expect(usersSource).toContain('key: "FISCAL_MANAGE"');
    expect(usersSource).toContain('label: "Faturamento"');
  });
});
