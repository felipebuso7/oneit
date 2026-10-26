import { z } from "zod";

export const riskSchema = z.object({ organizationId: z.uuid(), title: z.string().trim().min(5).max(240), description: z.string().trim().min(10).max(10000), likelihood: z.coerce.number().int().min(1).max(5), impact: z.coerce.number().int().min(1).max(5) });
export const riskWorkflowSchema = z.object({ riskId: z.uuid(), status: z.enum(["TREATMENT", "ACCEPTED", "CLOSED"]), treatment: z.enum(["MITIGATE", "TRANSFER", "AVOID", "ACCEPT"]).optional(), treatmentPlan: z.string().trim().max(10000).optional(), treatmentResult: z.string().trim().max(10000).optional(), residualLikelihood: z.coerce.number().int().min(1).max(5).optional(), residualImpact: z.coerce.number().int().min(1).max(5).optional(), acceptanceJustification: z.string().trim().max(10000).optional() });
