import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("cabeçalhos de segurança", () => {
  it("mantém proteção de transporte, framing, MIME e permissões", () => {
    const source = readFileSync("next.config.ts", "utf8");
    expect(source).toContain('Strict-Transport-Security');
    expect(source).toContain('X-Frame-Options');
    expect(source).toContain('X-Content-Type-Options');
    expect(source).toContain('Permissions-Policy');
  });
});
