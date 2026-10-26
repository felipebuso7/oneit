import { describe, expect, it } from "vitest";
import { toScheduleTimestamp } from "./scheduling";

describe("toScheduleTimestamp", () => {
  it("creates an ISO timestamp", () => expect(toScheduleTimestamp("2026-09-30", "08:30")).toContain("T"));
  it("rejects invalid times", () => expect(() => toScheduleTimestamp("2026-09-30", "invalid")).toThrow());
});
