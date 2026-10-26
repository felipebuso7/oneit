import { z } from "zod";
export const assignableRoles = ["ORG_ADMIN", "DISPATCHER", "MANAGER", "TECHNICIAN", "AUDITOR", "FINANCE"] as const;
export const inviteOrganizationUserSchema = z.object({ organizationId: z.uuid(), email: z.email(), fullName: z.string().trim().min(3).max(200), role: z.enum(assignableRoles) });
export const revokeOrganizationRoleSchema = z.object({ organizationId: z.uuid(), userId: z.uuid(), role: z.enum(assignableRoles) });
export const changeOrganizationRoleSchema = z.object({
  organizationId: z.uuid(),
  userId: z.uuid(),
  currentRole: z.enum(assignableRoles),
  role: z.enum(assignableRoles),
});
