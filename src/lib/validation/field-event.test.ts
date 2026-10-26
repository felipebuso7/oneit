import { describe, expect, it } from "vitest";
import { fieldEventSchema } from "./field-event";

const event = { ticketId: "019cda50-f764-7a5e-9101-513020ce22e8", eventType: "ARRIVAL" };
describe("field event validation", () => {
  it("requires GPS or a meaningful exception reason", () => {
    expect(fieldEventSchema.safeParse(event).success).toBe(false);
    expect(fieldEventSchema.safeParse({ ...event, justification: "GPS indisponível na unidade" }).success).toBe(true);
    expect(fieldEventSchema.safeParse({ ...event, latitude: -23.5, longitude: -46.6, accuracy: 30 }).success).toBe(true);
  });
  it("rejects partial, impossible and invalid location measurements", () => {
    expect(fieldEventSchema.safeParse({ ...event, latitude: -23.5, justification: "GPS indisponível na unidade" }).success).toBe(false);
    expect(fieldEventSchema.safeParse({ ...event, latitude: 91, longitude: 0, accuracy: 10 }).success).toBe(false);
    expect(fieldEventSchema.safeParse({ ...event, latitude: 0, longitude: 0, accuracy: -1 }).success).toBe(false);
  });
});
