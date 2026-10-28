import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const collection = readFileSync("src/app/api/field-service/lpu/route.ts", "utf8");
const resource = readFileSync("src/app/api/field-service/lpu/[id]/route.ts", "utf8");
const client = readFileSync("src/app/(portal)/portal/settings/field-service/lpu/lpu-settings-client.tsx", "utf8");

describe("ciclo CRUD da LPU", () => {
  it("expõe consulta e criação com unidade e preço validados", () => {
    expect(collection).toContain("export async function GET");
    expect(collection).toContain("export async function POST");
    expect(collection).toContain('z.enum(units)');
    expect(collection).toContain("unitPrice: z.number().finite().nonnegative()");
    expect(collection).toContain("LPU_ITEM_ALREADY_EXISTS");
  });

  it("permite editar, desativar e reativar sem apagar o registro", () => {
    expect(resource).toContain("export async function PATCH");
    expect(resource).toContain("export async function DELETE");
    expect(resource).toContain("active: value.active");
    expect(resource).toContain("update({ active: false })");
    expect(client).toContain('item.active ? "Desativar" : "Reativar"');
    expect(client).toContain('active: true');
  });

  it("protege o ciclo com autenticação, origem e limite de payload", () => {
    for (const source of [collection, resource]) {
      expect(source).toContain("createClient");
      expect(source).toContain("auth.getUser");
      expect(source).toContain("hasSameOrigin");
      expect(source).toContain("readLimitedBody");
    }
  });
});
