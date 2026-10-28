import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("cabling BM PDF branding", () => {
  it("uses both OneIT and Servicia marks in the PDF header", () => {
    const source = readFileSync("src/app/api/field-service/fiscal/batch/[id]/cabling-pdf/route.ts", "utf8");
    expect(source).toContain('readBrandLogo(pdf, "oneit-logo-rto.png")');
    expect(source).toContain('readBrandLogo(pdf, "servicia-logo-rto.png")');
    expect(source).toContain("page.drawImage(oneitLogo");
    expect(source).toContain("page.drawImage(serviciaLogo");
  });
});
