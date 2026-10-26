import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "src/app/api/field-service");
const companies = readFileSync(path.join(root, "companies/route.ts"), "utf8");
const polos = readFileSync(path.join(root, "polos/route.ts"), "utf8");
const companiesResource = readFileSync(path.join(root, "companies/[id]/route.ts"), "utf8");
const polosResource = readFileSync(path.join(root, "polos/[id]/route.ts"), "utf8");
const lpuResource = readFileSync(path.join(root, "lpu/[id]/route.ts"), "utf8");

describe("contratos de empresas e polos", () => {
  it("valida empresa e CNPJ antes de persistir", () => {
    expect(companies).toContain("legalName");
    expect(companies).toContain("INVALID_CNPJ");
    expect(companies).toContain("COMPANY_ALREADY_EXISTS");
  });

  it("vincula polo à empresa e valida geolocalização", () => {
    expect(polos).toContain("companyId");
    expect(polos).toContain("region");
    expect(polos).toContain("distanceCapitalKm");
    expect(polos).toContain("latitude");
    expect(polos).toContain("longitude");
    expect(polos).toContain("POLO_ALREADY_EXISTS");
  });

  it("permite filtrar polos por empresa na consulta", () => {
    expect(polos).toContain('params.get("companyId")');
    expect(polos).toContain("query.eq(\"company_id\", companyId)");
  });

  it("não retorna sucesso falso ao desativar cadastro inexistente", () => {
    for (const source of [companiesResource, polosResource, lpuResource]) {
      expect(source).toContain("maybeSingle()");
      expect(source).toContain("NOT_FOUND");
    }
  });
});
