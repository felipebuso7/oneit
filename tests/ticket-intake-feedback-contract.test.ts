import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/tickets/ticket-intake-form.tsx", "utf8");

describe("feedback da abertura de chamados", () => {
  it("não permite clique duplo silencioso durante a Server Action", () => {
    expect(source).toContain("useFormStatus");
    expect(source).toContain('"Abrindo…"');
    expect(source).toContain('aria-live="polite"');
  });
});
