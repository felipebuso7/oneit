import { z } from "zod";
import { checklistSchema } from "../offline/agenda";
import { executionSchema } from "./execution";

export const executionSyncSchema = executionSchema.extend({
  actionId: z.uuid(), ownerId: z.uuid(), items: checklistSchema,
}).refine((value) => Object.keys(value.answers).length === value.items.length && value.items.every((item) => Object.hasOwn(value.answers, item.item_code)), "Respostas não correspondem ao checklist.");
export type ExecutionSync = z.infer<typeof executionSyncSchema>;
export const executionReceiptSchema = z.object({ actionId: z.uuid(), recordId: z.uuid() });
