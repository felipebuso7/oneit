import { z } from "zod";

export const ticketImpactSchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
export type TicketImpact = z.infer<typeof ticketImpactSchema>;
export const ticketTypeSchema = z.enum(["INCIDENT", "SERVICE_REQUEST", "ACCESS_REQUEST", "EVENT", "PREVENTIVE", "CONSULTATION"]);

export const createTicketSchema = z.object({
  organizationId: z.uuid(),
  servicenowNumber: z.string().trim().min(1, "Informe o número do ServiceNow.").max(160),
  servicenowOpenedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida."),
  customerId: z.uuid(),
  contractId: z.uuid().optional(),
  serviceOfferingId: z.uuid().optional(),
  requesterCollaboratorId: z.uuid().optional(),
  departmentUnitId: z.uuid().optional(),
  ticketType: ticketTypeSchema,
  locationId: z.uuid(),
  title: z.string().trim().min(5).max(240),
  description: z.string().trim().min(10).max(10_000),
  requesterContactPhone: z.string().trim().max(40).optional(),
  impact: ticketImpactSchema,
  urgency: ticketImpactSchema,
  slaPolicyId: z.uuid().optional(),
});

export const transitionTicketSchema = z.object({
  ticketId: z.uuid(),
  targetStatus: z.enum(["TRIAGE"]),
});

export const ticketCommunicationSchema = z.object({
  ticketId: z.uuid(),
  audience: z.enum(["CUSTOMER", "INTERNAL"]),
  message: z.string().trim().min(3).max(12_000),
});

export const ticketTriageContextSchema = z.object({
  ticketId: z.uuid(),
  requesterCollaboratorId: z.uuid().optional(),
  departmentUnitId: z.uuid().optional(),
  serviceOfferingId: z.uuid().optional(),
});

export const ticketIdSchema = z.object({ ticketId: z.uuid() });

export const scheduleTicketSchema = z.object({
  ticketId: z.uuid(), technicianId: z.uuid(), plannedStart: z.coerce.date(), plannedEnd: z.coerce.date(),
}).refine(({ plannedStart, plannedEnd }) => plannedEnd > plannedStart, { message: "O fim deve ser posterior ao início.", path: ["plannedEnd"] });
