import { describe, expect, it } from "vitest";
import { pendingOptions } from "./pending";
import { pendingSchema, rescheduleSchema } from "../../lib/validation/pending";

describe("operational pending rules", () => {
  it("limits available reasons to the stage of execution", () => {
    expect(pendingOptions("TRAVEL_STARTED")).toEqual(["PENDING_ACCESS"]);
    expect(pendingOptions("WORK_STARTED")).toEqual(["PENDING_MATERIAL", "PENDING_CLIENT_IT"]);
    expect(pendingOptions("CLOSED")).toEqual([]);
    expect(pendingOptions("PENDING_ACCESS")).toEqual([]);
  });
  const base = { ticketId: "019cda50-f764-7a5e-9101-513020ce22e8", version: 2, reason: "Unidade fechada no horário previsto" };
  it("rejects empty reasons and unsupported pending statuses", () => {
    expect(pendingSchema.safeParse({ ...base, status: "PENDING_ACCESS" }).success).toBe(true);
    expect(pendingSchema.safeParse({ ...base, status: "CLOSED" }).success).toBe(false);
    expect(pendingSchema.safeParse({ ...base, status: "PENDING_ACCESS", reason: " " }).success).toBe(false);
  });
  it("requires explicit timezone and positive schedule duration", () => {
    const input = { ...base, technicianId: "019cda50-f764-7a5e-9101-513020ce22e9", start: "2026-10-02T08:00:00-03:00", end: "2026-10-02T12:00:00Z" };
    expect(rescheduleSchema.safeParse(input).success).toBe(true);
    expect(rescheduleSchema.safeParse({ ...input, start: "2026-10-02T08:00:00" }).success).toBe(false);
    expect(rescheduleSchema.safeParse({ ...input, end: "2026-10-02T10:00:00Z" }).success).toBe(false);
  });
});
