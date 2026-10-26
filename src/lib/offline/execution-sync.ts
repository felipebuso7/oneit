import { loadExecutionDraft, markDraftConfirmed } from "./execution-draft";
import { executionReceiptSchema, executionSyncSchema, type ExecutionSync } from "../validation/execution-sync";

export async function syncSavedExecution(ownerId: string, ticketId: string, password: string, send: (payload: ExecutionSync) => Promise<Response>) {
  const draft = await loadExecutionDraft(ownerId, ticketId, password);
  if (!draft) throw new Error("Nenhum rascunho salvo para esta conta e OS.");
  const parsed = executionSyncSchema.safeParse({ ...draft, actionId: draft.revision });
  if (!parsed.success) throw new Error("Rascunho incompleto. Diagnóstico e solução precisam de pelo menos 10 caracteres; confira o checklist.");
  let response: Response;
  try { response = await send(parsed.data); }
  catch { throw new Error("Sem confirmação. Rascunho preservado; repita com a mesma cópia, sem editá-la para tentar novamente."); }
  if (response.status === 401) throw new Error("Entre novamente online na mesma conta. Rascunho preservado.");
  if ([403, 409].includes(response.status)) throw new Error("Conflito de versão, checklist, atribuição, permissão ou chave. Rascunho preservado; confira a OS com a gestão. Não há reenvio automático.");
  if ([400, 413, 415, 422].includes(response.status)) throw new Error("Execução rejeitada. Revise os dados online; rascunho preservado.");
  if (!response.ok) throw new Error("Servidor indisponível. Rascunho preservado; tente novamente sem modificar a cópia salva.");
  let receipt;
  try { receipt = executionReceiptSchema.safeParse(await response.json()); }
  catch { throw new Error("Confirmação ilegível. Rascunho preservado; repita o envio da mesma cópia."); }
  if (!receipt.success || receipt.data.actionId !== draft.revision) throw new Error("Confirmação não corresponde ao envio. Rascunho preservado; tente novamente com a mesma cópia.");
  let marked = false;
  try { marked = await markDraftConfirmed(ownerId, ticketId, draft.revision, receipt.data.recordId); } catch { /* Server acknowledgement remains valid even if local storage fails. */ }
  return { recordId: receipt.data.recordId, marked };
}
