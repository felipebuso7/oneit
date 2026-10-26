import { describe, expect, it } from "vitest";
import { announcementSchema } from "./announcement";

describe("announcementSchema", () => {
  const valid = { organizationId: "6c61aecc-0b2a-4a38-b1f6-c55c36f1d94d", title: "Manutenção", message: "Serviço em manutenção programada.", severity: "IMPORTANT", startsAt: "2026-10-07T09:00", endsAt: "2026-10-07T10:00", requiresAcknowledgement: true };
  it("accepts a timed operational notice", () => expect(announcementSchema.safeParse(valid).success).toBe(true));
  it("rejects an inverted visibility window", () => expect(announcementSchema.safeParse({ ...valid, endsAt: valid.startsAt }).success).toBe(false));
});
