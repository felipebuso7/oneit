import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("PDF produtivo do BM", () => {
  it("inclui contexto financeiro e dimensões da OS", () => {
    const source = readFileSync("src/app/api/field-service/measurement/[id]/pdf/route.ts", "utf8");
    for (const field of ["customer_id", "contract_id", "location_id", "department_unit_id", "service_offering_id", "competence"]) expect(source).toContain(field);
    for (const label of ["CLIENTE", "EMPRESA / PRESTADOR", "OBRA / DEPARTAMENTO", "CONTRATO", "COMPETÊNCIA", "OS CONSOLIDADAS", "STATUS"]) expect(source).toContain(label);
    expect(source).toContain("MEASUREMENT_DOCUMENT_INCOMPLETE");
    expect(source).toContain("MEASUREMENT_TOTAL_MISMATCH");
  });
});
