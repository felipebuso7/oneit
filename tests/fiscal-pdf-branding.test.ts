import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("fiscal PDF branding", () => {
  it("uses the OneIT and Servicia marks on the cover", () => {
    const source = readFileSync("src/app/api/field-service/fiscal/batch/[id]/pdf/route.ts", "utf8");
    expect(source).toContain('readBrandLogo(pdf, "oneit-logo-rto.png")');
    expect(source).toContain('readBrandLogo(pdf, "servicia-logo-rto.png")');
    expect(source).toContain("cover.drawImage(oneitLogo");
    expect(source).toContain("cover.drawImage(serviciaLogo");
  });
});
