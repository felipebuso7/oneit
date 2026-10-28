import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const component = readFileSync("src/components/tickets/ticket-create-flow.tsx", "utf8");

describe("ticket creation reset", () => {
  it("starts each new ticket without values from the previous draft", () => {
    expect(component).toContain("const openNewTicket = () => {");
    expect(component).toContain('setSearch("");');
    expect(component).toContain('setOfferingId("");');
    expect(component).toContain('setCustomerId("");');
    expect(component).toContain('setLocationId("");');
    expect(component).toContain("onClick={openNewTicket}");
  });
});
