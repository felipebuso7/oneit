import { describe, expect, it } from "vitest";
import { reviewHref, reviewOrderId, reviewPageNumber } from "@/lib/field-service/review-navigation";

describe("review navigation", () => {
  it.each([undefined, "", "0", "-1", "1.5", "Infinity", "NaN", "100001"])("defaults an invalid page %s to the first page", (value) => {
    expect(reviewPageNumber(value)).toBe(1);
  });
  it("preserves valid page numbers", () => {
    expect(reviewPageNumber("3")).toBe(3);
  });
  it("builds a scoped review URL for an OS", () => {
    const id = "d567b2e9-dc46-406d-8236-cbb98e82540a";
    expect(reviewOrderId(id)).toBe(id);
    expect(new URL(reviewHref(id), "https://oneit.example").searchParams.get("order")).toBe(id);
    expect(reviewHref()).toBe("/portal/review");
  });
  it.each(["invalid", "../../admin", "x&organization=other"])("rejects invalid OS identifier %s", (value) => {
    expect(reviewOrderId(value)).toBeNull();
  });
});
