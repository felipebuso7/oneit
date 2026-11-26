import { z } from "zod";

export const organizationEmailSettingsSchema = z.object({
  organizationId: z.uuid(),
  provider: z.enum(["RESEND", "GMAIL"]),
  fromEmail: z.union([z.literal(""), z.email()]).transform((value) => value || null),
});
