import { z } from "zod";
export const pendingSchema = z.object({
  ticketId: z.uuid(), version: z.coerce.number().int().positive(), reason: z.string().trim().min(10).max(2000),
  status: z.enum(["PENDING_CUSTOMER", "PENDING_ACCESS", "PENDING_MATERIAL", "PENDING_THIRD_PARTY", "PENDING_CLIENT_IT", "WAITING_AUTHORIZATION"]),
});
export const resumeSchema = pendingSchema.omit({ status: true });
export const rescheduleSchema = resumeSchema.extend({
  technicianId: z.uuid(), start: z.iso.datetime({ offset: true }), end: z.iso.datetime({ offset: true }),
}).refine((value) => new Date(value.end) > new Date(value.start), { message: "Fim deve ser posterior ao início.", path: ["end"] });
