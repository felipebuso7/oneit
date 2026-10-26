import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const files = [
  "src/app/api/field-service/companies/route.ts",
  "src/app/api/field-service/companies/[id]/route.ts",
  "src/app/api/field-service/polos/route.ts",
  "src/app/api/field-service/polos/[id]/route.ts",
  "src/app/api/field-service/lpu/route.ts",
  "src/app/api/field-service/lpu/[id]/route.ts",
];

describe("contratos das APIs de cadastro", () => {
  it("protege todos os endpoints com autenticação e origem", () => {
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source).toContain("createClient");
      expect(source).toContain("auth.getUser");
      expect(source).toContain("hasSameOrigin");
      expect(source).toContain("readLimitedBody");
    }
  });

  it("expõe operações de consulta, criação e manutenção", () => {
    expect(readFileSync(files[0], "utf8")).toContain("export async function GET");
    expect(readFileSync(files[0], "utf8")).toContain("export async function POST");
    expect(readFileSync(files[1], "utf8")).toContain("export async function PATCH");
    expect(readFileSync(files[1], "utf8")).toContain("export async function DELETE");
    expect(readFileSync(files[2], "utf8")).toContain("companyId");
    expect(readFileSync(files[4], "utf8")).toContain("validUntil");
  });

  it("retorna conflito para duplicidades de cadastro", () => {
    for (const file of files.filter((item) => !item.includes("[id]"))) {
      expect(readFileSync(file, "utf8")).toContain("23505");
    }
    for (const file of files.filter((item) => item.includes("[id]") && !item.includes("lpu"))) {
      const source = readFileSync(file, "utf8");
      if (source.includes(".update(") && source.includes("PGRST116")) {
        expect(source).toContain("23505");
      }
    }
  });
});
