import { z } from "zod";
export const organizationUnitSchema = z.object({ organizationId: z.uuid(), type: z.enum(["COMPANY","DEPARTMENT","COST_CENTER","WORK_SITE"]), code: z.string().trim().min(1).max(100), name: z.string().trim().min(2).max(240) });
export const updateOrganizationUnitSchema = z.object({
  organizationUnitId: z.uuid(),
  code: z.string().trim().min(1).max(100),
  name: z.string().trim().min(2).max(240),
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
});
export const collaboratorAssignmentSchema = z.object({ collaboratorId: z.uuid(), companyUnitId: z.uuid().optional(), departmentUnitId: z.uuid().optional(), costCenterUnitId: z.uuid().optional(), workSiteUnitId: z.uuid().optional(), startsOn: z.string().date(), endsOn: z.string().date().optional() }).refine((value) => !value.endsOn || value.endsOn >= value.startsOn, { path: ["endsOn"], message: "Fim anterior ao início." });
