import { describe, expect, it } from "vitest";
import { closureSchema } from "./closure";
const input = { ticketId: "019cda50-f764-7a5e-9101-513020ce22e8", reportId: "019cda50-f764-7a5e-9101-513020ce22e9", version: 12, closureReason: "Atendimento validado e aprovado", exceptionReason: "Integração externa ainda não habilitada", exceptionAcknowledged: true };
describe("administrative closure", () => {
  it("requires an explicit exception acknowledgement", () => {
    expect(closureSchema.safeParse(input).success).toBe(true);
    expect(closureSchema.safeParse({ ...input, exceptionAcknowledged: false }).success).toBe(false);
    expect(closureSchema.safeParse({ ...input, exceptionAcknowledged: undefined }).success).toBe(false);
  });
  it("rejects missing justification, invalid report IDs and versions", () => {
    expect(closureSchema.safeParse({ ...input, exceptionReason: " " }).success).toBe(false);
    expect(closureSchema.safeParse({ ...input, closureReason: "OK" }).success).toBe(false);
    expect(closureSchema.safeParse({ ...input, reportId: "fake" }).success).toBe(false);
    expect(closureSchema.safeParse({ ...input, version: 0 }).success).toBe(false);
  });
});
