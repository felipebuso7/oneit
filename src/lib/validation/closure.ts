import { z } from "zod";

export const closureSchema = z.object({
  ticketId: z.uuid(), reportId: z.uuid(), version: z.coerce.number().int().positive(),
  closureReason: z.string().trim().min(10).max(2000),
  exceptionReason: z.string().trim().min(10).max(2000),
  exceptionAcknowledged: z.literal(true),
});

export const closureErrorMessages: Record<string, string> = {
  CLOSURE_NOT_AUTHORIZED: "Seu perfil não possui permissão para encerrar esta OS.",
  CLOSURE_VERSION_CONFLICT: "A OS foi alterada. Recarregue antes de encerrar.",
  CLOSURE_INVALID_STATE: "A OS precisa estar concluída, aprovada e com relatório gerado.",
  CLOSURE_EXCEPTION_REQUIRED: "Confirme e justifique a exceção de sincronização.",
  CLOSURE_LATEST_REPORT_REQUIRED: "Uma nova versão do relatório foi gerada. Recarregue a tela.",
  CLOSURE_APPROVAL_REQUIRED: "A conclusão precisa de aprovação gerencial.",
  CLOSURE_SELF_APPROVAL_FORBIDDEN: "O técnico responsável não pode encerrar a própria OS.",
  CLOSURE_REPORT_MISSING: "O arquivo PDF não foi encontrado no armazenamento.",
};
