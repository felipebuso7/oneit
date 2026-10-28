import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("RTO signature layout", () => {
  it("identifies technician and validator but renders only the customer signature", () => {
    const source = readFileSync("src/domain/reports/pdf.ts", "utf8");
    expect(source).toContain("Técnico: ${snapshot.technician_name");
    expect(source).toContain("Validador: ${snapshot.reviewer_name");
    expect(source).toContain("ASSINATURA DO RESPONSÁVEL");
    expect(source).not.toContain("ASSINATURA DO TÉCNICO");
    expect(source).not.toContain("ASSINATURA DO VALIDADOR");
  });
});
