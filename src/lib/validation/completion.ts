import { z } from "zod";

export const completionSchema = z.object({
  ticketId: z.uuid(), version: z.coerce.number().int().positive(),
  materialsUsed: z.enum(["YES", "NO"]), noMaterialReason: z.string().trim().max(2000).optional(),
}).refine((value) => value.materialsUsed === "YES" || (value.noMaterialReason?.length ?? 0) >= 10, {
  message: "Justifique quando não houver consumo de materiais.", path: ["noMaterialReason"],
});
export const reviewSchema = z.object({
  ticketId: z.uuid(), version: z.coerce.number().int().positive(),
  decision: z.enum(["APPROVE", "RETURN"]), reason: z.string().trim().min(10).max(2000),
});
