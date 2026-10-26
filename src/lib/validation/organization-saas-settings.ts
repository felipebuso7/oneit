import { z } from "zod";

const optionalColor = z.union([z.literal(""), z.string().regex(/^#[0-9A-Fa-f]{6}$/)]).transform((value) => value || null);

export const organizationSaasSettingsSchema = z.object({
  organizationId: z.uuid(),
  locale: z.string().regex(/^[a-z]{2,3}(-[A-Z]{2})?$/),
  timezone: z.string().trim().min(3).max(80),
  primaryColor: optionalColor,
  secondaryColor: optionalColor,
});
