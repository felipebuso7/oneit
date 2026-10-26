import { z } from "zod";

export const ticketClosureSchema = z.object({
  ticketId: z.uuid(),
  expectedVersion: z.number().int().positive(),
  reportId: z.uuid(),
  closureReason: z.string().trim().min(10).max(2000),
  exceptionReason: z.string().trim().min(10).max(2000),
  exceptionAcknowledged: z.literal(true),
});

export type TicketClosureInput = z.infer<typeof ticketClosureSchema>;
