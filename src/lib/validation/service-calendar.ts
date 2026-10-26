import { z } from "zod";
export const serviceCalendarSchema = z.object({ organizationId: z.uuid(), code: z.string().trim().regex(/^[A-Z0-9][A-Z0-9_-]{1,79}$/), name: z.string().trim().min(2).max(200), timezone: z.string().trim().min(3).max(100), calendarType: z.enum(["TWENTY_FOUR_SEVEN", "BUSINESS_HOURS"]) });
