import { z } from "zod";

export const governanceControlSchema = z.object({
  organizationId: z.uuid(),
  framework: z.enum(["ISO_IEC_20000_1_2018", "COBIT", "ITIL"]),
  referenceCode: z.string().trim().min(1).max(100),
  processName: z.string().trim().min(2).max(240),
  controlObjective: z.string().trim().min(10).max(2000),
  evidenceDescription: z.string().trim().max(2000).optional(),
  reviewFrequencyDays: z.coerce.number().int().min(1).max(1095).optional(),
});
