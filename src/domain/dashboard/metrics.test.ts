import { describe, expect, it } from "vitest";
import { dashboardMetrics } from "./metrics";
const now = Date.parse("2026-10-05T12:00:00Z");
describe("dashboard metrics", () => it("separates active backlog, pending and terminal tickets", () => {
  const value = dashboardMetrics([
    { operational_status: "IN_PROGRESS", administrative_status: "AWAITING_TRIAGE", opened_at: "2026-10-05T11:00:00Z", updated_at: "2026-10-05T11:30:00Z" },
    { operational_status: "PENDING_ACCESS", administrative_status: "AWAITING_TRIAGE", opened_at: "2026-10-03T11:00:00Z", updated_at: "2026-10-04T11:00:00Z" },
    { operational_status: "TECHNICALLY_COMPLETED", administrative_status: "AWAITING_REVIEW", opened_at: "2026-10-01T11:00:00Z", updated_at: "2026-10-05T10:00:00Z" },
  ], now);
  expect(value).toEqual({ total: 3, backlog: 2, pending: 1, field: 1, awaitingReview: 1, openedLast24h: 1, agedOver48h: 1 });
}));
