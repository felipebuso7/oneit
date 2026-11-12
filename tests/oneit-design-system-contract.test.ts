import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/globals.css", "utf8");
const components = [
  "src/components/oneit-button.tsx",
  "src/components/oneit-page-header.tsx",
  "src/components/oneit-data-table.tsx",
  "src/components/oneit-state.tsx",
  "src/components/oneit-status-badge.tsx",
].map((file) => readFileSync(file, "utf8"));

describe("contratos do Design System OneIT", () => {
  it("declara tokens de cor, espaçamento, raio, sombra e foco", () => {
    for (const token of ["--oneit-petrol-950", "--oneit-line", "--oneit-space-4", "--oneit-radius-lg", "--oneit-shadow-md", "--oneit-focus-ring"]) {
      expect(css).toContain(token);
    }
  });

  it("mantém os componentes compartilhados ligados aos tokens ou classes do sistema", () => {
    expect(components[0]).toContain("oneit-btn");
    expect(components[1]).toContain("oneit-page-header");
    expect(components[2]).toContain("oneit-data-table");
    expect(components[3]).toContain("oneit-card");
    expect(components[4]).toContain("OneitStatusBadge");
    expect(components.join("\n")).toMatch(/var\(--oneit-|oneit-(btn|card|page-header|data-table)/);
  });
});
