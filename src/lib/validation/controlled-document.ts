import { z } from "zod";
export const controlledDocumentSchema = z.object({ organizationId: z.uuid(), title: z.string().trim().min(5).max(240), category: z.string().trim().min(2).max(100), content: z.string().trim().min(10).max(50000), changeSummary: z.string().trim().min(10).max(10000) });
export const controlledDocumentIdSchema = z.object({ documentId: z.uuid() });
export const controlledDocumentVersionSchema = controlledDocumentIdSchema.extend({ content: z.string().trim().min(10).max(50000), changeSummary: z.string().trim().min(10).max(10000) });
