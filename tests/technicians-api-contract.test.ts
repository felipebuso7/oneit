import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "src/app/api/field-service/technicians");
const collection = readFileSync(path.join(root, "route.ts"), "utf8");
const resource = readFileSync(path.join(root, "[id]/route.ts"), "utf8");

describe("contrato da API de técnicos", () => {
  it("protege leitura e escrita com sessão, origem e limite de corpo", () => {
    expect(collection).toContain("getUser");
    expect(collection).toContain("hasSameOrigin");
    expect(collection).toContain("readLimitedBody");
    expect(resource).toContain("getUser");
    expect(resource).toContain("hasSameOrigin");
    expect(resource).toContain("readLimitedBody");
  });

  it("expõe criação, consulta, atualização e desativação lógica", () => {
    expect(collection).toContain("export async function GET");
    expect(collection).toContain("export async function POST");
    expect(resource).toContain("export async function PATCH");
    expect(resource).toContain("export async function DELETE");
    expect(resource).toContain("active: false");
    expect(resource).toContain("maybeSingle()");
    expect(resource).toContain("TECHNICIAN_NOT_FOUND");
  });

  it("mantém unicidade por organização e valida os campos essenciais", () => {
    expect(collection).toContain("TECHNICIAN_ALREADY_EXISTS");
    expect(collection).toContain("organizationId");
    expect(collection).toContain("email");
    expect(collection).toContain("name");
    expect(collection).toContain("technicianType");
    expect(collection).toContain('"internal", "partner"');
    expect(resource).toContain("TECHNICIAN_ALREADY_EXISTS");
    expect(resource).toContain("technician_type: value.technicianType");
    expect(resource).toContain("technician_type");
  });

  it("mantém a rota administrativa self-hosted pronta para despacho", () => {
    const source = readFileSync("src/app/api/administration/technicians/route.ts", "utf8");
    expect(source).toContain("active, status");
    expect(source).toContain("'AVAILABLE'");
  });

  it("mantém status e ativo coerentes na edição administrativa", () => {
    expect(readFileSync("src/app/api/administration/technicians/[id]/route.ts", "utf8"))
      .toContain("status=$14::public.technician_status");
    expect(readFileSync("src/app/api/administration/technicians/[id]/route.ts", "utf8"))
      .toContain('const nextStatus = !value.active');
  });
});
