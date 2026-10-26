import { describe, expect, it } from "vitest";

import { canAccessBilling, canAuditOperations, canExecuteFieldService, canManageFieldDispatch, canManageOrganization } from "./roles";

describe("canManageOrganization", () => {
  it.each(["SUPER_ADMIN", "ORG_ADMIN"] as const)("allows %s", (role) => {
    expect(canManageOrganization(role)).toBe(true);
  });

  it.each(["DISPATCHER", "MANAGER", "TECHNICIAN", "AUDITOR", "FINANCE"] as const)(
    "does not allow %s",
    (role) => {
      expect(canManageOrganization(role)).toBe(false);
    },
  );
});

describe("capacidades da operação", () => {
  it.each(["SUPER_ADMIN", "ORG_ADMIN", "MANAGER", "DISPATCHER"] as const)("permite despacho para %s", (role) => expect(canManageFieldDispatch(role)).toBe(true));
  it.each(["TECHNICIAN", "AUDITOR", "FINANCE"] as const)("bloqueia despacho para %s", (role) => expect(canManageFieldDispatch(role)).toBe(false));
  it("mantém execução de campo exclusiva do técnico autenticado", () => {
    expect(canExecuteFieldService("TECHNICIAN")).toBe(true);
    expect(canExecuteFieldService("MANAGER")).toBe(false);
  });
  it.each(["SUPER_ADMIN", "ORG_ADMIN", "FINANCE"] as const)("permite faturamento para %s", (role) => expect(canAccessBilling(role)).toBe(true));
  it.each(["DISPATCHER", "MANAGER", "TECHNICIAN", "AUDITOR"] as const)("bloqueia faturamento para %s", (role) => expect(canAccessBilling(role)).toBe(false));
  it.each(["SUPER_ADMIN", "ORG_ADMIN", "MANAGER", "AUDITOR"] as const)("permite auditoria para %s", (role) => expect(canAuditOperations(role)).toBe(true));
});
