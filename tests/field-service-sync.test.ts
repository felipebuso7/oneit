import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("src/app/demo/field-service/page.tsx", "utf8");

describe("sincronização do Field Service", () => {
  it("notifica os painéis após persistir mudanças na fila", () => {
    expect(source).toContain('localStorage.setItem(visitKey, JSON.stringify(visits))');
    expect(source).toContain('oneit-demo-field-visits-updated');
    expect(source).toContain("globalThis.window.dispatchEvent");
  });
});
