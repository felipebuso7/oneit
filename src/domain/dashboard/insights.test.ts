import { describe, expect, it } from "vitest";
import { operationalInsights } from "./insights";

describe("operational insights", () => it("summarizes period entries and active backlog dimensions", () => {
  const now = Date.parse("2026-10-07T12:00:00Z");
  const value = operationalInsights([
    { operational_status: "IN_PROGRESS", priority: 1, opened_at: "2026-10-06T12:00:00Z" },
    { operational_status: "PENDING_ACCESS", priority: 2, opened_at: "2026-09-30T12:00:00Z" },
    { operational_status: "TECHNICALLY_COMPLETED", priority: 1, opened_at: "2026-10-06T12:00:00Z" },
  ], 7, now);
  expect(value).toEqual({ openedInPeriod: 3, activeByStatus: [["IN_PROGRESS", 1], ["PENDING_ACCESS", 1]], activeByPriority: [[1, 1], [2, 1]] });
}));
