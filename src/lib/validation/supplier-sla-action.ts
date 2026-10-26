import { z } from "zod";
export const supplierSlaActionSchema = z.object({ slaRecordId: z.uuid(), supplierId: z.uuid(), organizationId: z.uuid(), actionDescription: z.string().trim().min(5).max(5000), ownerId: z.uuid().optional(), dueDate: z.string().date().optional(), evidenceReference: z.string().trim().max(1000).optional() });
