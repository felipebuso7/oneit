import { z } from "zod";

export const ticketRelationshipSchema = z.object({
  organizationId: z.uuid(),
  sourceTicketId: z.uuid(),
  targetTicketId: z.uuid(),
  relationshipType: z.enum(["RELATED_TO", "DUPLICATES", "BLOCKS", "CAUSED_BY"]),
  reason: z.string().trim().max(2000).optional(),
}).refine((value) => value.sourceTicketId !== value.targetTicketId, { path: ["targetTicketId"], message: "Um chamado não pode se relacionar a si mesmo." });

export const ticketNumberRelationshipSchema = z.object({
  ticketId: z.uuid(),
  parentTicketNumber: z.string().trim().min(3).max(80),
  relationshipType: z.enum(["MASS_INCIDENT_PARENT", "CONVERSATION_GROUPED"]),
  reason: z.string().trim().max(2000).optional(),
});
