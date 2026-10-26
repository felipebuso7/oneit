import { describe, expect, it } from "vitest";
import { internalAuditFindingSchema, internalAuditSchema } from "./internal-audit";

const id = "019cda50-f764-7a5e-9101-513020ce22e8";

describe("internal audit validation", () => {
  it("accepts a planned audit and a nonconformity finding", () => {
    expect(internalAuditSchema.safeParse({ organizationId: id, title: "Auditoria de gestão de mudanças", scope: "Processo de mudanças da organização.", criteria: "ISO/IEC 20000-1:2018" }).success).toBe(true);
    expect(internalAuditFindingSchema.safeParse({ auditId: id, findingType: "NONCONFORMITY", description: "A aprovação da mudança não contém evidência suficiente.", createNonconformity: true }).success).toBe(true);
  });

  it("blocks an NC created from a non-NC finding", () => {
    expect(internalAuditFindingSchema.safeParse({ auditId: id, findingType: "OBSERVATION", description: "A evidência precisa ser organizada em local controlado.", createNonconformity: true }).success).toBe(false);
  });
});
