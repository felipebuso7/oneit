import { describe, expect, it } from "vitest";
import {
  sgstiActivityTemplateSchema,
  sgstiDocumentSchema,
  sgstiDocumentObsolescenceSchema,
  sgstiEvidenceSchema,
  sgstiExecutionUpdateSchema,
} from "./sgsti";

const id = "550e8400-e29b-41d4-a716-446655440000";

describe("SGSTI validation", () => {
  it("requires an interval for a custom recurring activity", () => {
    const common = {
      organizationId: id,
      title: "Revisão anual do catálogo de serviços",
      activityType: "Revisão documental",
      effectiveFrom: "2026-10-15",
      dueAfterDays: 15,
    };

    expect(sgstiActivityTemplateSchema.safeParse({ ...common, periodicity: "CUSTOM" }).success).toBe(false);
    expect(sgstiActivityTemplateSchema.safeParse({ ...common, periodicity: "CUSTOM", customIntervalDays: 45 }).success).toBe(true);
  });

  it("keeps files and links traceable to an SGSTI record", () => {
    expect(sgstiEvidenceSchema.safeParse({ title: "Ata assinada", evidenceKind: "FILE", occurrenceId: id }).success).toBe(false);
    expect(sgstiEvidenceSchema.safeParse({ title: "Ata assinada", evidenceKind: "FILE", occurrenceId: id, storageKey: "sgsti/atas/2026-10.pdf" }).success).toBe(true);
  });

  it("allows folders without a file and requires a reference for documents", () => {
    expect(sgstiDocumentSchema.safeParse({ organizationId: id, title: "Gestão de nível de serviço", documentType: "FOLDER" }).success).toBe(true);
    expect(sgstiDocumentSchema.safeParse({ organizationId: id, title: "Procedimento de gestão de nível de serviço", documentType: "DOCUMENT" }).success).toBe(false);
  });

  it("requires a minutes record and result before completing a ritual", () => {
    const base = { occurrenceId: id, status: "COMPLETED" as const };
    expect(sgstiExecutionUpdateSchema.safeParse(base).success).toBe(false);
    expect(sgstiExecutionUpdateSchema.safeParse({ ...base, minutes: "Ata da reunião com decisões registradas.", resultSummary: "Revisão concluída e aprovada pelos participantes." }).success).toBe(true);
  });

  it("requires a documented justification to obsolete a controlled document", () => {
    expect(sgstiDocumentObsolescenceSchema.safeParse({ documentId: id, reason: "curta" }).success).toBe(false);
    expect(sgstiDocumentObsolescenceSchema.safeParse({ documentId: id, reason: "Substituído pela versão aprovada do procedimento em vigor." }).success).toBe(true);
  });
});
