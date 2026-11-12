import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const portalRoot = join(process.cwd(), "src", "app", "(portal)");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.(tsx?|jsx?)$/.test(entry.name) ? [path] : [];
  });
}

describe("isolamento entre portal autenticado e demonstração", () => {
  it("não usa localStorage nem chaves oneit.demo dentro das rotas do portal", () => {
    const violations = sourceFiles(portalRoot).flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return /localStorage|sessionStorage|oneit\.demo/i.test(source) ? [file] : [];
    });
    expect(violations).toEqual([]);
  });

  it("mantém a demonstração explicitamente separada por rota", () => {
    const proxy = readFileSync(join(process.cwd(), "src", "proxy.ts"), "utf8");
    expect(proxy).toContain('pathname === "/demo" || pathname.startsWith("/demo/")');
    expect(proxy).toContain('pathname === "/api/demo" || pathname.startsWith("/api/demo/")');
    expect(proxy).toContain('process.env.ONEIT_PREVIEW_MODE === "demo"');
  });
});
