import { z } from "zod";

export const nonconformitySchema = z.object({
  organizationId: z.uuid(),
  recordType: z.enum(["NONCONFORMITY", "OBSERVATION", "IMPROVEMENT_OPPORTUNITY"]),
  requirementReference: z.string().trim().max(500).optional(),
  description: z.string().trim().min(10).max(10000),
  dueAt: z.string().datetime().optional(),
});
