import { describe, expect, it } from "vitest";
import { ticketReviewSchema } from "./ticket-review";

const base = { ticketId: "00000000-0000-4000-8000-000000000001", expectedVersion: 3, decision: "APPROVE" as const, reason: "Fotos, relatório e materiais conferidos pelo gestor." };

describe("ticket review", () => {
  it("accepts an approval with an auditable reason", () => expect(ticketReviewSchema.safeParse(base).success).toBe(true));
  it("requires a reason with enough detail", () => expect(ticketReviewSchema.safeParse({ ...base, reason: "ok" }).success).toBe(false));
  it("accepts returning a completion for correction", () => expect(ticketReviewSchema.safeParse({ ...base, decision: "RETURN", reason: "Falta evidência da instalação no local." }).success).toBe(true));
});
