import { z } from "zod";
export const serviceLevelPauseSchema = z.object({ ticketId: z.uuid(), version: z.coerce.number().int().positive(), reason: z.string().trim().min(10).max(2000) });
