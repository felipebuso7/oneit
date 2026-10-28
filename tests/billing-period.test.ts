import { describe, expect, it } from "vitest";
import { competenceDateRange } from "../src/lib/field-service/billing-period";

describe("competence date range", () => {
  it("uses the actual last day of each month", () => {
    expect(competenceDateRange("2026-02")).toBe("2026-02-01 a 2026-02-28");
    expect(competenceDateRange("2028-02")).toBe("2028-02-01 a 2028-02-29");
    expect(competenceDateRange("2026-04")).toBe("2026-04-01 a 2026-04-30");
    expect(competenceDateRange("2026-12")).toBe("2026-12-01 a 2026-12-31");
  });

  it("does not manufacture a range for an invalid competence", () => {
    expect(competenceDateRange("2026-13")).toBe("2026-13");
  });
});
