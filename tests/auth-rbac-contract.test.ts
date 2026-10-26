import { describe, expect, it } from "vitest";
import { canAccessBilling, canAuditOperations, canExecuteFieldService, canManageFieldDispatch } from "@/lib/auth/roles";

describe("contrato RBAC da operação", () => {
  it("separa despacho, execução, faturamento e auditoria", () => {
    expect(canManageFieldDispatch("MANAGER")).toBe(true);
    expect(canManageFieldDispatch("TECHNICIAN")).toBe(false);
    expect(canExecuteFieldService("TECHNICIAN")).toBe(true);
    expect(canExecuteFieldService("FINANCE")).toBe(false);
    expect(canAccessBilling("FINANCE")).toBe(true);
    expect(canAccessBilling("DISPATCHER")).toBe(false);
    expect(canAuditOperations("AUDITOR")).toBe(true);
    expect(canAuditOperations("TECHNICIAN")).toBe(false);
  });
});
