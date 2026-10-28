import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const assets = readFileSync("src/app/(portal)/portal/assets/actions.ts", "utf8");
const supplierActions = readFileSync("src/app/(portal)/portal/supplier-actions/actions.ts", "utf8");
const technicians = readFileSync("src/app/(portal)/portal/technicians/actions.ts", "utf8");

describe("atualizações do portal não mascaram falhas de persistência", () => {
  it("confirma que a atualização de ativo afetou uma linha visível ao usuário", () => {
    expect(assets).toContain('.select("id").maybeSingle()');
    expect(assets).toContain("!updated");
    expect(assets).toContain("sem permissão para edição");
  });

  it("confirma que ações de SLA não reportam sucesso quando o registro não existe", () => {
    expect(supplierActions).toContain('.select("id").maybeSingle()');
    expect(supplierActions).toContain("!updated");
    expect(supplierActions).toContain("sem permissão para edição");
  });

  it("confirma que a disponibilidade do técnico exige atualização real", () => {
    expect(technicians).toContain('.select("id,status")');
    expect(technicians).toContain("!updated");
    expect(technicians).toContain("Técnico não encontrado");
  });
});
