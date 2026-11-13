import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const operationalRoutes = [
  "tickets",
  "field-service",
  "review",
  "scheduling",
  "routes",
  "reports",
  "field-service-reports",
  "service-catalog",
  "technicians",
  "collaborators",
  "settings/field-service/lpu",
  "priority-matrix",
] as const;

describe("cabeçalho compartilhado das rotas operacionais", () => {
  it("mantém as telas centrais na hierarquia visual do OneIT", () => {
    for (const route of operationalRoutes) {
      const source = readFileSync(`src/app/(portal)/portal/${route}/page.tsx`, "utf8");
      expect(source, route).toContain("OneitPageHeader");
    }
  });
});
