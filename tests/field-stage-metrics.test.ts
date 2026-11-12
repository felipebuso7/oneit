import { describe, expect, it } from "vitest";
import { fieldStage, isInField } from "@/domain/dashboard/field-stage";
import { dashboardMetrics } from "@/domain/dashboard/metrics";

describe("field operation indicators", () => {
  it.each([
    ["ASSIGNED", "DISPATCHED", "scheduled"],
    ["TRAVEL_STARTED", "TRAVELING", "traveling"],
    ["ON_SITE", "CHECKED_IN", "onSite"],
    ["IN_PROGRESS", "IN_SERVICE", "onSite"],
    ["TECHNICALLY_COMPLETED", "COMPLETED", null],
    ["CANCELLED", "CANCELLED", null],
  ])("maps ticket %s and OS %s to the same stage", (ticket, order, expected) => {
    expect(fieldStage(ticket!, "ticket")).toBe(expected);
    expect(fieldStage(order!, "order")).toBe(expected);
    expect(isInField(ticket!, "ticket")).toBe(isInField(order!, "order"));
  });

  it("does not count scheduling or an unknown status as execution", () => {
    expect(isInField("SCHEDULED", "ticket")).toBe(false);
    expect(isInField("DISPATCHED", "order")).toBe(false);
    expect(isInField("FUTURE_STATUS", "order")).toBe(false);
  });

  it("separates scheduled work and excludes administratively closed tickets", () => {
    const make = (operational_status: string, administrative_status = "AWAITING_TRIAGE") => ({ operational_status, administrative_status, opened_at: "2026-10-01T12:00:00Z", updated_at: "2026-10-29T12:00:00Z" });
    const metrics = dashboardMetrics([
      make("ASSIGNED"), make("SCHEDULED"), make("TRAVEL_STARTED"), make("ON_SITE"),
      make("ASSIGNED", "CLOSED"), make("IN_PROGRESS", "CLOSED"),
      make("TECHNICALLY_COMPLETED", "AWAITING_REVIEW"), make("CANCELLED"),
    ], Date.parse("2026-10-29T13:00:00Z"));
    expect(metrics.scheduled).toBe(2);
    expect(metrics.field).toBe(2);
    expect(metrics.backlog).toBe(4);
    expect(metrics.awaitingReview).toBe(1);
    expect(metrics.agedOver48h).toBe(4);
  });
});
