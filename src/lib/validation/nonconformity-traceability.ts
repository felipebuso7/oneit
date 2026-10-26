import { z } from "zod";

export const nonconformitySourceSchema = z.object({
  nonconformityId: z.uuid(),
  sourceKind: z.enum(["TICKET", "AUDIT", "RITUAL", "CUSTOMER_FEEDBACK", "SUPPLIER", "RISK", "MANUAL"]),
  sourceSystem: z.string().trim().max(120).optional(),
  externalReference: z.string().trim().min(1).max(300),
  sourceUrl: z.string().trim().url().max(2000).optional(),
  note: z.string().trim().max(3000).optional(),
});

export const nonconformityCauseAnalysisSchema = z.object({
  nonconformityId: z.uuid(),
  method: z.enum(["FIVE_WHYS", "ISHIKAWA", "PROCESS_ANALYSIS", "FREEFORM"]),
  problemStatement: z.string().trim().min(10).max(10000),
  directCause: z.string().trim().max(10000).optional(),
  contributingFactors: z.string().trim().max(10000).optional(),
  rootCause: z.string().trim().min(10).max(10000),
  containmentAction: z.string().trim().max(10000).optional(),
  effectivenessDueAt: z.string().datetime().optional(),
});
