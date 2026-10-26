import { z } from "zod";

export const serviceLevelPolicySchema = z.object({
  contractId: z.uuid(), priority: z.coerce.number().int().min(1).max(5),
  serviceOfferingId: z.uuid().optional(),
  calendarId: z.uuid().optional(),
  responseMinutes: z.coerce.number().int().min(1).max(525600), resolutionMinutes: z.coerce.number().int().min(1).max(525600), olaMinutes: z.coerce.number().int().min(1).max(525600),
}).refine((value) => value.responseMinutes <= value.resolutionMinutes, { path: ["resolutionMinutes"], message: "Resolução não pode ser menor que a resposta." });
