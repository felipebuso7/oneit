import { z } from "zod";
import { materialUsageSchema } from "./evidence";

export const offlineMaterialSchema = materialUsageSchema.extend({
  id: z.uuid(), ownerId: z.uuid(), version: z.number().int().positive(), capturedAt: z.iso.datetime({ offset: true }),
});
export type OfflineMaterial = z.infer<typeof offlineMaterialSchema>;
export const materialReceiptSchema = z.object({ id: z.uuid(), materialRecordId: z.uuid() });
