import { z } from "zod";

export const sgstiPeriodicitySchema = z.enum([
  "ONCE",
  "MONTHLY",
  "QUARTERLY",
  "SEMIANNUAL",
  "ANNUAL",
  "CUSTOM",
]);

export const sgstiActivityStatusSchema = z.enum([
  "PLANNED",
  "IN_PROGRESS",
  "AWAITING_EVIDENCE",
  "UNDER_REVIEW",
  "COMPLETED",
  "OVERDUE",
  "CANCELLED",
]);

export const sgstiActivityTemplateSchema = z
  .object({
    organizationId: z.uuid(),
    title: z.string().trim().min(3).max(240),
    activityType: z.string().trim().min(2).max(120),
    processId: z.uuid().nullable().optional(),
    isoReference: z.string().trim().max(120).nullable().optional(),
    policyReference: z.string().trim().max(120).nullable().optional(),
    periodicity: sgstiPeriodicitySchema,
    customIntervalDays: z.coerce.number().int().min(1).max(1095).nullable().optional(),
    effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data de início válida."),
    leadTimeDays: z.coerce.number().int().min(0).max(365).default(15),
    dueAfterDays: z.coerce.number().int().min(0).max(1095),
    reminderDays: z.array(z.coerce.number().int().min(0).max(365)).max(10).default([15, 3, 0]),
    defaultResponsibleId: z.uuid().nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.periodicity === "CUSTOM" && !value.customIntervalDays) {
      context.addIssue({
        code: "custom",
        path: ["customIntervalDays"],
        message: "Informe o intervalo em dias para a periodicidade personalizada.",
      });
    }
  });

export const sgstiExecutionRecordSchema = z.object({
  occurrenceId: z.uuid(),
  minutes: z.string().trim().max(50000).optional(),
  decisions: z.string().trim().max(30000).optional(),
  actionPlan: z.string().trim().max(30000).optional(),
  resultSummary: z.string().trim().max(10000).optional(),
  nonconformityCount: z.coerce.number().int().min(0).max(999).default(0),
  improvementOpportunityCount: z.coerce.number().int().min(0).max(999).default(0),
});

export const sgstiExecutionUpdateSchema = sgstiExecutionRecordSchema.extend({
  attendees: z.string().trim().max(10000).optional(),
  status: z.enum(["IN_PROGRESS", "AWAITING_EVIDENCE", "UNDER_REVIEW", "COMPLETED"]).default("IN_PROGRESS"),
  justification: z.string().trim().max(10000).optional(),
}).superRefine((value, context) => {
  if (value.status !== "COMPLETED") return;
  if (!value.minutes || value.minutes.trim().length < 10) {
    context.addIssue({ code: "custom", path: ["minutes"], message: "A ata é obrigatória para concluir a atividade." });
  }
  if (!value.resultSummary || value.resultSummary.trim().length < 10) {
    context.addIssue({ code: "custom", path: ["resultSummary"], message: "Registre o resultado antes de concluir a atividade." });
  }
});

export const sgstiEvidenceSchema = z
  .object({
    occurrenceId: z.uuid().nullable().optional(),
    auditId: z.uuid().nullable().optional(),
    title: z.string().trim().min(3).max(240),
    evidenceKind: z.enum(["FILE", "EXTERNAL_LINK", "TICKET", "CHANGE", "PROBLEM", "REPORT", "DASHBOARD", "DOCUMENT", "METRIC", "OTHER"]),
    externalUrl: z.url().nullable().optional(),
    storageKey: z.string().trim().min(3).max(1024).nullable().optional(),
    note: z.string().trim().max(10000).nullable().optional(),
  })
  .superRefine((value, context) => {
    if (!value.occurrenceId && !value.auditId) {
      context.addIssue({ code: "custom", path: ["occurrenceId"], message: "A evidência deve estar vinculada a uma atividade ou auditoria." });
    }
    if (["FILE", "EXTERNAL_LINK"].includes(value.evidenceKind) && !value.externalUrl && !value.storageKey) {
      context.addIssue({ code: "custom", path: ["externalUrl"], message: "Informe um arquivo armazenado ou link externo para esta evidência." });
    }
  });

export const sgstiDocumentSchema = z
  .object({
    organizationId: z.uuid(),
    title: z.string().trim().min(3).max(240),
    documentType: z.enum(["FOLDER", "DOCUMENT"]),
    parentId: z.uuid().nullable().optional(),
    processId: z.uuid().nullable().optional(),
    externalUrl: z.url().nullable().optional(),
    storageKey: z.string().trim().min(3).max(1024).nullable().optional(),
    nextReviewAt: z.string().datetime().nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.documentType === "DOCUMENT" && !value.externalUrl && !value.storageKey) {
      context.addIssue({ code: "custom", path: ["externalUrl"], message: "Informe o link do documento ou o arquivo armazenado." });
    }
  });

export const sgstiDocumentObsolescenceSchema = z.object({
  documentId: z.uuid(),
  reason: z.string().trim().min(10).max(10000),
});

export const sgstiAuditSchema = z.object({
  organizationId: z.uuid(),
  title: z.string().trim().min(5).max(240),
  auditKind: z.enum(["INTERNAL", "EXTERNAL", "FOLLOW_UP"]),
  scope: z.string().trim().min(10).max(10000),
  criteria: z.string().trim().min(3).max(10000),
  leadAuditorId: z.uuid().nullable().optional(),
  auditeeId: z.uuid().nullable().optional(),
  plannedAt: z.string().datetime(),
});

export const sgstiAuditFindingSchema = z.object({
  auditId: z.uuid(),
  findingType: z.enum(["NONCONFORMITY", "OBSERVATION", "IMPROVEMENT_OPPORTUNITY", "STRENGTH"]),
  requirementReference: z.string().trim().max(500).nullable().optional(),
  description: z.string().trim().min(10).max(10000),
  evidenceSummary: z.string().trim().max(10000).nullable().optional(),
  nonconformityId: z.uuid().nullable().optional(),
});
