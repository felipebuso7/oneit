import { describe, expect, it } from "vitest";
import { assertTransition, canTransition } from "./state-machine";

describe("ticket state machine", () => {
  it("allows the main operational flow", () => {
    expect(canTransition("NEW", "TRIAGE")).toBe(true);
    expect(canTransition("TRIAGE", "AWAITING_SCHEDULING")).toBe(true);
    expect(canTransition("IN_PROGRESS", "TECHNICALLY_COMPLETED")).toBe(true);
  });

  it("rejects skipped and terminal transitions", () => {
    expect(canTransition("NEW", "ON_SITE")).toBe(false);
    expect(() => assertTransition("TECHNICALLY_COMPLETED", "IN_PROGRESS")).toThrow("Invalid ticket transition");
  });
});
