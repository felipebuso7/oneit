import { z } from "zod";
export const declareMajorIncidentSchema = z.object({ ticketId: z.uuid(), impactSummary: z.string().trim().min(10).max(10000) });
export const majorIncidentCommunicationSchema = z.object({ incidentId: z.uuid(), audience: z.enum(["INTERNAL","CUSTOMER","EXECUTIVE"]), message: z.string().trim().min(10).max(10000) });
export const majorIncidentStatusSchema = z.object({ incidentId: z.uuid(), status: z.enum(["MITIGATING","RESOLVED","CLOSED"]), resolutionSummary: z.string().trim().max(10000).optional() });
