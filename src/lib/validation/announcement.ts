import { z } from "zod";

export const announcementSchema = z.object({
  organizationId: z.uuid(), title: z.string().trim().min(3).max(160), message: z.string().trim().min(3).max(5000),
  severity: z.enum(["INFO", "ATTENTION", "IMPORTANT", "CRITICAL"]),
  startsAt: z.coerce.date(), endsAt: z.coerce.date(), requiresAcknowledgement: z.boolean(),
}).refine((value) => value.endsAt > value.startsAt, { message: "O término deve ser posterior ao início.", path: ["endsAt"] });

export const announcementIdSchema = z.object({ announcementId: z.uuid() });
