import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const component = readFileSync("src/components/tickets/ticket-create-flow.tsx", "utf8");

describe("ticket creation organization context", () => {
  it("clears dependent selections when changing organization", () => {
    expect(component).toContain('setCategoryId(""); setOfferingId(""); setCustomerId(""); setLocationId("");');
  });
});
