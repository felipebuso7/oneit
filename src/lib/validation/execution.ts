import { z } from "zod";

export const faultDomains = ["CABLING", "ACTIVE_NETWORK_EQUIPMENT", "ENDPOINT", "POWER", "CLIENT_SYSTEM", "UNKNOWN", "OTHER"] as const;
export const executionSchema = z.object({
  ticketId: z.uuid(),
  version: z.coerce.number().int().positive(),
  faultDomain: z.enum(faultDomains),
  diagnosis: z.string().trim().min(10).max(10000),
  solution: z.string().trim().min(10).max(10000),
  answers: z.record(z.string().min(1).max(80), z.boolean()),
});
