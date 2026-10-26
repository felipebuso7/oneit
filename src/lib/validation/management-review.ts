import { z } from "zod";
export const managementReviewSchema = z.object({ organizationId: z.uuid(), scheduledAt: z.string().datetime(), agenda: z.string().trim().min(10).max(10000) });
export const managementReviewDecisionSchema = z.object({ reviewId: z.uuid(), title: z.string().trim().min(5).max(240), decision: z.string().trim().min(10).max(10000), dueAt: z.string().datetime().optional() });
export const managementReviewCompletionSchema = z.object({ reviewId: z.uuid(), conclusion: z.string().trim().min(10).max(10000) });
