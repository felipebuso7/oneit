import { z } from "zod";

export const oneitModuleKeys = ["OPERATION", "SERVICE_MANAGEMENT", "FIELD_SERVICE", "SGSTI", "ADMINISTRATION"] as const;
export const visibilityScopes = ["ALL_LOCATIONS", "OWN_ASSIGNMENTS", "OWN_LEVEL", "SELECTED_LOCATIONS"] as const;

export const userModuleAccessSchema = z.object({
  organizationId: z.uuid(),
  userId: z.uuid(),
  moduleKey: z.enum(oneitModuleKeys),
  enabled: z.boolean(),
  visibilityScope: z.enum(visibilityScopes),
});

export const userPermissionGrantSchema = z.object({
  organizationId: z.uuid(),
  userId: z.uuid(),
  permissionKey: z.string().regex(/^[A-Z][A-Z0-9_]{1,79}$/),
  enabled: z.boolean(),
});

export const copyUserAccessProfileSchema = z.object({
  organizationId: z.uuid(),
  sourceUserId: z.uuid(),
  targetUserId: z.uuid(),
}).refine((value) => value.sourceUserId !== value.targetUserId, {
  message: "Escolha outro usuário como origem do perfil.",
  path: ["sourceUserId"],
});

export const technicianProfileSchema = z.object({
  organizationId: z.uuid(),
  userId: z.uuid().nullable().optional(),
  fullName: z.string().trim().min(3).max(240),
  email: z.string().trim().email().max(320).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  mobile: z.string().trim().max(40).nullable().optional(),
  employeeIdentifier: z.string().trim().max(100).nullable().optional(),
  jobTitle: z.string().trim().max(160).nullable().optional(),
  employmentType: z.enum(["INTERNAL", "PARTNER", "CONTRACTOR"]),
  hourlyCost: z.coerce.number().min(0).max(1_000_000).nullable().optional(),
  visibilityScope: z.enum(visibilityScopes),
  externalPartnerReference: z.string().trim().max(240).nullable().optional(),
  active: z.boolean(),
});

export const userAccessCommandSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("MODULE"), value: userModuleAccessSchema }),
  z.object({ kind: z.literal("PERMISSION"), value: userPermissionGrantSchema }),
  z.object({ kind: z.literal("COPY"), value: copyUserAccessProfileSchema }),
]);
