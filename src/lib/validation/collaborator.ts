import { z } from "zod";
export const collaboratorSchema = z.object({ organizationId: z.uuid(), employeeNumber: z.string().trim().min(1).max(100), fullName: z.string().trim().min(2).max(240), primaryEmail: z.string().trim().email().max(320).optional(), phone: z.string().trim().max(30).optional(), managerCollaboratorId: z.uuid().optional(), locationId: z.uuid().optional() });
