import { z } from "zod";

export const fieldEventSchema = z.object({
  ticketId: z.uuid(),
  eventType: z.enum(["TRAVEL_STARTED", "ARRIVAL", "WORK_STARTED"]),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  accuracy: z.number().min(0).max(100_000).optional(),
  justification: z.string().trim().max(1000).optional(),
}).superRefine((value, context) => {
  const coordinates = value.latitude !== undefined && value.longitude !== undefined && value.accuracy !== undefined;
  const partial = value.latitude !== undefined || value.longitude !== undefined || value.accuracy !== undefined;
  if (partial && !coordinates) context.addIssue({ code: "custom", message: "Localização incompleta.", path: ["latitude"] });
  if (!coordinates && (value.justification?.length ?? 0) < 10) context.addIssue({ code: "custom", message: "Justifique a ausência de GPS com pelo menos 10 caracteres.", path: ["justification"] });
});
