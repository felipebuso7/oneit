import { z } from "zod";

export const supportGroupSchema = z.object({ organizationId: z.uuid(), code: z.string().trim().regex(/^[A-Z0-9][A-Z0-9_-]{1,79}$/), name: z.string().trim().min(2).max(200), supportLevel: z.coerce.number().int().min(1).max(3) });
export const ticketEscalationSchema = z.object({ ticketId: z.uuid(), targetGroupId: z.uuid(), escalationType: z.enum(["FUNCTIONAL", "HIERARCHICAL"]), reason: z.string().trim().min(10).max(2000), technicalSummary: z.string().trim().min(10).max(10000).optional() });
