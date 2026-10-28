import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const actions = readFileSync("src/app/(portal)/portal/tickets/actions.ts", "utf8");

describe("ticket creation error contract", () => {
  it("exposes actionable messages for invalid organization references", () => {
    expect(actions).toContain("TICKET_SERVICE_OFFERING_INVALID");
    expect(actions).toContain("Ticket customer must belong");
    expect(actions).toContain("Ticket contract must belong");
    expect(actions).toContain("Ticket location must belong");
  });
});
