import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("field validation flow", () => {
  it("routes the manager to the ticket resolution as the single final decision point", () => {
    const source = readFileSync("src/app/demo/field-service/validation-v2/page.tsx", "utf8");
    expect(source).toContain("Abrir decisão no chamado");
    expect(source).toContain("&tab=Resolução");
    expect(source).toContain("LPU a conferir");
  });
});
