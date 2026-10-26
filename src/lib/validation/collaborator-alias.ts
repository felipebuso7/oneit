import { z } from "zod";
export const collaboratorAliasSchema = z.object({ collaboratorId: z.uuid(), email: z.string().trim().email().max(320), isPrimary: z.boolean() });
export const collaboratorAliasIdSchema = z.object({ aliasId: z.uuid() });
