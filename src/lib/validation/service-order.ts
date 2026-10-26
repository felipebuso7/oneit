import { z } from "zod";
export const serviceOrderSchema=z.object({ticketId:z.uuid(),contractId:z.uuid().optional(),locationId:z.uuid().optional(),technicianId:z.uuid().optional(),supplierId:z.uuid().optional(),scheduledAt:z.coerce.date().optional()});
