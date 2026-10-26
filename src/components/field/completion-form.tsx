import { completeTicket } from "@/app/(portal)/portal/field/completion-actions";

export function CompletionForm({ ticketId, version }: { ticketId: string; version: number }) {
  return <form action={completeTicket} className="mt-6 space-y-3 border-t pt-5">
    <h3 className="font-semibold">Concluir atendimento</h3>
    <p className="text-sm text-slate-600">Salve o diagnóstico e marque os itens obrigatórios do checklist. São necessárias fotos de antes, depois e resultado do teste, além dos três check-ins.</p>
    <input type="hidden" name="ticketId" value={ticketId} /><input type="hidden" name="version" value={version} />
    <label className="block text-sm">Houve consumo de materiais?<select name="materialsUsed" required defaultValue="" className="mt-1 block w-full rounded border p-2"><option value="" disabled>Selecione</option><option value="YES">Sim, registrado na OS</option><option value="NO">Não houve consumo</option></select></label>
    <label className="block text-sm">Justificativa se não houve consumo<textarea name="noMaterialReason" maxLength={2000} className="mt-1 block w-full rounded border p-2" /></label>
    <button className="w-full rounded bg-slate-900 px-4 py-3 font-semibold text-white" type="submit">Enviar para revisão</button>
  </form>;
}
