import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("headers de segurança do Next", () => {
  it("aplica política de referrer, anti-frame e nosniff globalmente", () => {
    const source = readFileSync("next.config.ts", "utf8");
    expect(source).toContain('source: "/(.*)"');
    expect(source).toContain('key: "Referrer-Policy"');
    expect(source).toContain('value: "no-referrer"');
    expect(source).toContain('key: "X-Frame-Options"');
    expect(source).toContain('value: "DENY"');
    expect(source).toContain('key: "X-Content-Type-Options"');
  });
});
