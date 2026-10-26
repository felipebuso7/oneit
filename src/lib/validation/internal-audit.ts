import { z } from "zod";

export const internalAuditSchema = z.object({
  organizationId: z.uuid(),
  title: z.string().trim().min(5).max(240),
  scope: z.string().trim().min(10).max(10000),
  criteria: z.string().trim().min(3).max(10000),
  plannedAt: z.string().datetime().optional(),
});

export const internalAuditFindingSchema = z.object({
  auditId: z.uuid(),
  findingType: z.enum(["NONCONFORMITY", "OBSERVATION", "IMPROVEMENT_OPPORTUNITY"]),
  requirementReference: z.string().trim().max(500).optional(),
  description: z.string().trim().min(10).max(10000),
  evidence: z.string().trim().min(3).max(10000).optional(),
  createNonconformity: z.boolean(),
}).superRefine((value, context) => {
  if (value.createNonconformity && value.findingType !== "NONCONFORMITY") context.addIssue({ code: "custom", path: ["createNonconformity"], message: "Apenas não conformidades podem abrir uma NC." });
});

export const completeInternalAuditSchema = z.object({ auditId: z.uuid() });
