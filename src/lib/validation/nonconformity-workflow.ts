import { z } from "zod";

export const nonconformityWorkflowSchema = z.object({
  nonconformityId: z.uuid(),
  status: z.enum(["CORRECTION", "CORRECTIVE_ACTION", "EFFECTIVENESS", "CLOSED"]),
  immediateCorrection: z.string().trim().max(10000).optional(),
  rootCause: z.string().trim().max(10000).optional(),
  effectivenessResult: z.string().trim().max(10000).optional(),
});

export const nonconformityActionPlanSchema = z.object({
  nonconformityId: z.uuid(),
  description: z.string().trim().min(10).max(10000),
  priority: z.coerce.number().int().min(1).max(5),
  dueAt: z.string().datetime().optional(),
});
