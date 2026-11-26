import { describe, expect, it } from "vitest";
import { priceTravel } from "@/domain/field-service/travel-pricing";

describe("travel pricing", () => {
  it("does not invent a value without a contract rule", () => expect(priceTravel(30, null).status).toBe("PENDING_RULE"));
  it("calculates estimated round trip with franchise", () => {
    expect(priceTravel(30, { mode: "PER_KM", returnMode: "ESTIMATED_RETURN", ratePerKm: 1.5, franchiseKm: 10 })).toMatchObject({ consideredKm: 60, billableKm: 50, amount: 75 });
  });
  it("applies fixed amount and caps", () => expect(priceTravel(30, { mode: "FIXED", returnMode: "NONE", fixedAmount: 90, maxAmount: 80 }).amount).toBe(80));
  it("uses actual return only when configured", () => expect(priceTravel(30, { mode: "PER_KM", returnMode: "ACTUAL_RETURN", ratePerKm: 2 }, 12).amount).toBe(84));
});
