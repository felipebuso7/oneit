export const platformRoles = ["SUPER_ADMIN", "ORG_ADMIN", "DISPATCHER", "MANAGER", "TECHNICIAN", "AUDITOR", "FINANCE"] as const;
export type PlatformRole = (typeof platformRoles)[number];

export function canManageOrganization(role: PlatformRole): boolean {
  return role === "SUPER_ADMIN" || role === "ORG_ADMIN";
}

export function canManageFieldDispatch(role: PlatformRole): boolean {
  return role === "SUPER_ADMIN" || role === "ORG_ADMIN" || role === "MANAGER" || role === "DISPATCHER";
}

export function canExecuteFieldService(role: PlatformRole): boolean {
  return role === "TECHNICIAN";
}

export function canAccessBilling(role: PlatformRole): boolean {
  return role === "SUPER_ADMIN" || role === "ORG_ADMIN" || role === "FINANCE";
}

export function canAuditOperations(role: PlatformRole): boolean {
  return role === "SUPER_ADMIN" || role === "ORG_ADMIN" || role === "MANAGER" || role === "AUDITOR";
}
