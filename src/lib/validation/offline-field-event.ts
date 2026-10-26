import { z } from "zod";
import { fieldEventSchema } from "./field-event";

export const offlineFieldEventSchema = fieldEventSchema.safeExtend({
  id: z.uuid(),
  ownerId: z.uuid(),
  version: z.number().int().positive(),
  capturedAt: z.iso.datetime({ offset: true }),
});
export type OfflineFieldEvent = z.infer<typeof offlineFieldEventSchema>;

export const fieldEventReceiptSchema = z.object({ id: z.uuid(), eventId: z.uuid() });
