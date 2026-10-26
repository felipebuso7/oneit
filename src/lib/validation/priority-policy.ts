import { z } from "zod";
import { ticketImpactSchema } from "./ticket";

export const priorityPolicySchema = z.object({
  organizationId: z.uuid(),
  impact: ticketImpactSchema,
  urgency: ticketImpactSchema,
  priority: z.coerce.number().int().min(1).max(5),
});
