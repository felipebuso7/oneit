import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function filesUnder(root: string): string[] {
  return readdirSync(root).flatMap((name) => {
    const path = join(root, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  }).filter((path) => /\.(ts|tsx)$/.test(path));
}

describe("fronteira de persistência da produção", () => {
  it("não usa localStorage nos caminhos operacionais autenticados", () => {
    const roots = [
      "src/app/api",
      "src/app/(portal)",
      "src/app/field-service",
      "src/lib/field-service",
      "src/components/field-service",
    ];
    const offenders = roots.flatMap((root) => filesUnder(root).filter((path) => readFileSync(path, "utf8").includes("localStorage")));
    expect(offenders).toEqual([]);
  });

  it("não importa telas ou componentes demo nos caminhos operacionais autenticados", () => {
    const roots = ["src/app/api", "src/app/(portal)", "src/app/field-service", "src/lib/field-service", "src/components/field-service"];
    const offenders = roots.flatMap((root) => filesUnder(root).filter((path) => {
      const source = readFileSync(path, "utf8");
      return /@\/app\/demo(?:\/|['\"])/.test(source) || /@\/components\/demo(?:-|\/)/.test(source);
    }));
    expect(offenders).toEqual([]);
  });
});
