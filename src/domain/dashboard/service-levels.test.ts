import { describe, expect, it } from "vitest";
import { olaMetrics, resolutionMetrics, responseMetrics } from "./service-levels";
describe("resolution dashboard metrics", () => it("counts only configured active tickets and their expired resolution target", () => {
  const levels = [{ ticket_id: "a", response_due_at: "2026-10-05T11:00:00Z", resolution_due_at: "2026-10-05T11:00:00Z", ola_due_at: "2026-10-05T11:00:00Z", response_met_at: null, ola_met_at: null }, { ticket_id: "b", response_due_at: "2026-10-01T11:00:00Z", resolution_due_at: "2026-10-01T11:00:00Z", ola_due_at: "2026-10-01T11:00:00Z", response_met_at: null, ola_met_at: null }, { ticket_id: "hidden", response_due_at: "2026-10-01T11:00:00Z", resolution_due_at: "2026-10-01T11:00:00Z", ola_due_at: "2026-10-01T11:00:00Z", response_met_at: null, ola_met_at: null }];
  expect(resolutionMetrics([{ id: "a", operational_status: "IN_PROGRESS" }, { id: "b", operational_status: "TECHNICALLY_COMPLETED" }], levels, [], Date.parse("2026-10-05T12:00:00Z"))).toEqual({ configured: 1, paused: 0, overdue: 1 });
  expect(resolutionMetrics([{ id: "a", operational_status: "IN_PROGRESS" }], levels.slice(0, 1), ["a"], Date.parse("2026-10-05T12:00:00Z"))).toEqual({ configured: 1, paused: 1, overdue: 0 });
}));
describe("response and OLA dashboard metrics", () => it("stops counting a target after its milestone", () => {
  const ticket = [{ id: "a", operational_status: "IN_PROGRESS" }]; const level = [{ ticket_id: "a", response_due_at: "2026-10-05T11:00:00Z", resolution_due_at: "2026-10-05T11:00:00Z", ola_due_at: "2026-10-05T11:00:00Z", response_met_at: "2026-10-05T10:00:00Z", ola_met_at: null }];
  expect(responseMetrics(ticket, level, [], Date.parse("2026-10-05T12:00:00Z"))).toEqual({ configured: 1, paused: 0, overdue: 0 });
  expect(olaMetrics(ticket, level, [], Date.parse("2026-10-05T12:00:00Z"))).toEqual({ configured: 1, paused: 0, overdue: 1 });
}));
