import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const files = [
  "src/app/api/sgsti/activities/route.ts",
  "src/app/api/sgsti/activities/[id]/execution/route.ts",
  "src/app/api/sgsti/master-plan/route.ts",
  "src/app/api/sgsti/master-plan/tasks/[id]/actions/route.ts",
  "src/app/api/sgsti/master-plan/tasks/[id]/evidences/route.ts",
  "src/app/api/sgsti/master-plan/tasks/[id]/execution/route.ts",
];

describe("caminhos de produção", () => {
  it("não invalida cache de páginas demo a partir de APIs operacionais", () => {
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toContain("/demo/");
      expect(source).toContain("/portal/");
    }
  });
});
