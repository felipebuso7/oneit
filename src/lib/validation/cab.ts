import { z } from "zod";
export const cabMeetingSchema = z.object({ organizationId: z.uuid(), title: z.string().trim().min(5).max(240), scheduledAt: z.coerce.date(), notes: z.string().trim().max(10000).optional() });
export const cabItemSchema = z.object({ meetingId: z.uuid(), changeId: z.uuid() });
