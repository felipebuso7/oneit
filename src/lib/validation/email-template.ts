import { z } from "zod";

const allowedVariables = new Set(["requester.name", "ticket.number", "ticket.category", "ticket.status", "organization.name"]);
function safeTemplate(value: string) {
  if (/<\s*script|javascript\s*:/i.test(value)) return false;
  const variables = [...value.matchAll(/\{\{\s*([^{}\s]+)\s*\}\}/g)].map((match) => match[1]);
  return !value.includes("{{") || (variables.length > 0 && variables.every((variable) => allowedVariables.has(variable)));
}
export const emailTemplateSchema = z.object({
  organizationId: z.uuid(), templateKey: z.string().trim().regex(/^[a-z][a-z0-9_]{2,79}$/),
  subject: z.string().trim().min(3).max(240).refine(safeTemplate, "Variável ou conteúdo inseguro."),
  bodyText: z.string().trim().min(3).max(12000).refine(safeTemplate, "Variável ou conteúdo inseguro."),
});
