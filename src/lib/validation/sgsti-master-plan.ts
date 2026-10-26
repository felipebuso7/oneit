import { z } from "zod";

export const sgstiInitiativePrioritySchema = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);
export const sgstiTaskStatusSchema = z.enum(["PLANNED", "IN_PROGRESS", "AWAITING_EVIDENCE", "UNDER_REVIEW", "COMPLETED", "EFFECTIVENESS_VERIFIED", "BLOCKED"]);
export const sgstiActionKindSchema = z.enum(["CORRECTION", "CORRECTIVE_ACTION", "IMPROVEMENT", "PREVENTIVE_ACTION", "RISK_TREATMENT"]);

export const sgstiInitiativeSchema = z.object({
  organizationId: z.uuid(),
  code: z.string().trim().regex(/^MEL-\d{2}$/),
  title: z.string().trim().min(5).max(240),
  priority: sgstiInitiativePrioritySchema,
  isoReferences: z.array(z.string().trim().min(2).max(120)).min(1).max(20),
  description: z.string().trim().min(10).max(10000).optional(),
  ownerId: z.uuid().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
});

export const sgstiInitiativeTaskSchema = z.object({
  initiativeId: z.uuid(),
  code: z.string().trim().regex(/^MEL-\d{2}\.\d{2}$/),
  title: z.string().trim().min(5).max(500),
  acceptanceCriteria: z.string().trim().min(10).max(10000),
  expectedEvidence: z.string().trim().min(3).max(10000),
  ownerId: z.uuid().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
});

export const sgstiMasterPlanCreateSchema = sgstiInitiativeSchema.extend({
  tasks: z.array(sgstiInitiativeTaskSchema.omit({ initiativeId: true })).max(300).default([]),
});

export const sgstiTaskExecutionSchema = z.object({
  taskId: z.uuid(),
  status: sgstiTaskStatusSchema,
  executionSummary: z.string().trim().max(10000).optional(),
  blockerReason: z.string().trim().max(5000).optional(),
  evidenceIds: z.array(z.uuid()).max(50).default([]),
}).superRefine((value, context) => {
  if (["COMPLETED", "EFFECTIVENESS_VERIFIED"].includes(value.status) && (!value.executionSummary || value.executionSummary.length < 10)) {
    context.addIssue({ code: "custom", path: ["executionSummary"], message: "Descreva o que foi realizado antes de concluir a tarefa." });
  }
  if (["UNDER_REVIEW", "COMPLETED", "EFFECTIVENESS_VERIFIED"].includes(value.status) && value.evidenceIds.length === 0) {
    context.addIssue({ code: "custom", path: ["evidenceIds"], message: "Vincule ao menos uma evidência para validação." });
  }
  if (value.status === "BLOCKED" && (!value.blockerReason || value.blockerReason.length < 10)) {
    context.addIssue({ code: "custom", path: ["blockerReason"], message: "Justifique o impedimento da tarefa." });
  }
});

export const sgstiTaskActionSchema = z.object({
  taskId: z.uuid(),
  actionKind: sgstiActionKindSchema,
  description: z.string().trim().min(10).max(10000),
  priority: z.coerce.number().int().min(1).max(5),
  ownerId: z.uuid().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
});

export const sgstiTaskEvidenceLinkSchema = z.object({
  taskId: z.uuid(),
  evidenceId: z.uuid(),
});
