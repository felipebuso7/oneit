import { z } from "zod";

export const ticketReviewSchema = z.object({
  ticketId: z.uuid(),
  expectedVersion: z.number().int().positive(),
  decision: z.enum(["APPROVE", "RETURN"]),
  reason: z.string().trim().min(10).max(2000),
});

export type TicketReviewInput = z.infer<typeof ticketReviewSchema>;
