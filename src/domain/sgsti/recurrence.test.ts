import { describe, expect, it } from "vitest";
import { nextSgstiOccurrence, sgstiReminderDates } from "./recurrence";

describe("SGSTI recurrence", () => {
  it("preserves the last valid day for monthly and annual calendar cycles", () => {
    expect(nextSgstiOccurrence(new Date("2028-01-31T00:00:00.000Z"), "MONTHLY")?.toISOString()).toBe("2028-02-29T00:00:00.000Z");
    expect(nextSgstiOccurrence(new Date("2028-02-29T00:00:00.000Z"), "ANNUAL")?.toISOString()).toBe("2029-02-28T00:00:00.000Z");
  });

  it("requires a valid interval for custom periodicity", () => {
    expect(() => nextSgstiOccurrence(new Date("2026-10-01T00:00:00.000Z"), "CUSTOM")).toThrow("CUSTOM_INTERVAL_REQUIRED");
    expect(nextSgstiOccurrence(new Date("2026-10-01T00:00:00.000Z"), "CUSTOM", 45)?.toISOString()).toBe("2026-11-15T00:00:00.000Z");
  });

  it("creates deduplicated reminders and always includes the due date", () => {
    const reminders = sgstiReminderDates(new Date("2026-10-16T00:00:00.000Z"), [15, 3, 0, 3]);
    expect(reminders.map((date) => date.toISOString())).toEqual([
      "2026-10-01T00:00:00.000Z",
      "2026-10-13T00:00:00.000Z",
      "2026-10-16T00:00:00.000Z",
    ]);
  });
});
