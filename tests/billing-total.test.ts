import { describe, expect, it } from "vitest";
import { billingTotalsMatch } from "../src/lib/field-service/billing-total";

describe("BM total integrity", () => {
  it("accepts line totals that match the frozen batch total within one cent", () => {
    expect(billingTotalsMatch(15, [10, 5])).toBe(true);
    expect(billingTotalsMatch(15, [10, 4.995])).toBe(true);
  });

  it("rejects divergent or invalid totals", () => {
    expect(billingTotalsMatch(15, [10, 4])).toBe(false);
    expect(billingTotalsMatch(15, [10, Number.NaN])).toBe(false);
  });
});
