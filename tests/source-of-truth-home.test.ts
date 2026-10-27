import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("portal is the primary entry point", () => {
  it("exposes the authenticated portal before the isolated demonstration", () => {
    const source = readFileSync("src/app/page.tsx", "utf8");
    expect(source).toContain('href="/portal"');
    expect(source).toContain("Entrar no portal");
    expect(source).toContain("A demonstração é isolada");
  });
});
