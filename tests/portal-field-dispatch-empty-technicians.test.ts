import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("field dispatch technician feedback", () => {
  it("explains why the technician selector is empty", () => {
    const source = readFileSync("src/app/(portal)/portal/field-service/dispatch-workspace.tsx", "utf8");
    expect(source).toContain("Nenhum técnico elegível para esta organização");
    expect(source).toContain("Os técnicos cadastrados estão indisponíveis");
    expect(source).toContain("/portal/technicians");
  });
});
