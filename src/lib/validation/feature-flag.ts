import { z } from "zod";
export const featureFlagSchema = z.object({ organizationId: z.uuid(), flagKey: z.string().trim().regex(/^[a-z][a-z0-9_]{2,79}$/), enabled: z.boolean() });
