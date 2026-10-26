import { describe, expect, it } from "vitest";
import { operationalReportMetrics } from "./operational-metrics";

describe("operational report metrics", () => it("calculates closure and SLA metrics only from administratively closed tickets", () => {
  const start = Date.parse("2026-10-01T00:00:00Z"); const end = Date.parse("2026-11-01T00:00:00Z");
  const value = operationalReportMetrics([
    { id: "a", opened_at: "2026-10-02T00:00:00Z", closed_at: "2026-10-03T00:00:00Z" },
    { id: "b", opened_at: "2026-09-29T00:00:00Z", closed_at: "2026-10-05T00:00:00Z" },
    { id: "c", opened_at: "2026-10-10T00:00:00Z", closed_at: null },
  ], [{ ticket_id: "a", resolution_due_at: "2026-10-04T00:00:00Z" }, { ticket_id: "b", resolution_due_at: "2026-10-04T00:00:00Z" }], start, end);
  expect(value).toEqual({ opened: 2, closed: 2, closureRate: 100, averageClosureHours: 84, closedWithSla: 2, resolutionMet: 1, resolutionCompliance: 50 });
}));
