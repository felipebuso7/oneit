import { describe, expect, it } from "vitest";
import { derivePriority } from "./priority";

describe("derivePriority", () => {
  it("maps impact and urgency to a deterministic priority", () => {
    expect(derivePriority("HIGH", "HIGH")).toBe(1);
    expect(derivePriority("HIGH", "MEDIUM")).toBe(2);
    expect(derivePriority("LOW", "LOW")).toBe(5);
  });
});
