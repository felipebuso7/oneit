import { describe, expect, it } from "vitest";
import { cabMeetingSchema } from "./cab";
describe("CAB", () => it("requires a scheduled, titled meeting", () => { const item = { organizationId: "019cda50-f764-7a5e-9101-513020ce22e8", title: "CAB semanal", scheduledAt: "2026-10-06T15:00:00Z" }; expect(cabMeetingSchema.safeParse(item).success).toBe(true); expect(cabMeetingSchema.safeParse({ ...item, title: "CAB" }).success).toBe(false); }));
