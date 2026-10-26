import { draftMatches, loadExecutionDraft, saveExecutionDraft } from "../lib/offline/execution-draft";
import { faultDomains } from "../lib/validation/execution";
import type { LocalAgenda } from "../lib/offline/agenda";
import { syncSavedExecution } from "../lib/offline/execution-sync";

function node<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) {
  const value = document.createElement(tag); if (text) value.textContent = text; return value;
}
export function executionDraftForm(ticket: LocalAgenda["tickets"][number], ownerId: string, access: () => { password: string; fetchedAt: string } | undefined, confirmed: (recordId: string, marked: boolean) => Promise<void>) {
  const container = node("section");
  container.append(node("h4", "Rascunho local — não enviado ao servidor"), node("p", "Salve explicitamente antes de ocultar/fechar esta tela. Não há autosave nem conclusão offline."));
  const form = node("form");
  const domainLabel = node("label", "Origem da falha (rascunho)"); const domain = node("select");
  for (const value of faultDomains) { const option = node("option", value); option.value = value; domain.append(option); } domainLabel.append(domain);
  const diagnosisLabel = node("label", "Diagnóstico (pode estar incompleto)"); const diagnosis = node("textarea"); diagnosis.maxLength = 10000; diagnosisLabel.append(diagnosis);
  const solutionLabel = node("label", "Serviço realizado ou encaminhamento (rascunho)"); const solution = node("textarea"); solution.maxLength = 10000; solutionLabel.append(solution);
  const fieldset = node("fieldset"); fieldset.append(node("legend", "Checklist da cópia local"));
  const answers = new Map<string, HTMLInputElement>();
  for (const item of ticket.checklist) {
    const label = node("label", `${item.label}${item.required ? " (obrigatório para conclusão online)" : ""}`);
    const input = node("input"); input.type = "checkbox"; label.prepend(input); answers.set(item.item_code, input); fieldset.append(label);
  }
  const consentLabel = node("label", "Autorizo guardar este rascunho criptografado com a senha local desta agenda."); const consent = node("input"); consent.type = "checkbox"; consent.required = true; consentLabel.prepend(consent);
  const status = node("p"); status.setAttribute("role", "status");
  let revision: string | undefined; let saving = false;
  const restore = node("button", "Reabrir rascunho salvo"); restore.type = "button";
  restore.addEventListener("click", async () => {
    const current = access(); if (saving || !current) return;
    saving = true; restore.disabled = true;
    try {
      const draft = await loadExecutionDraft(ownerId, ticket.id, current.password);
      if (!draft) { status.textContent = "Nenhum rascunho salvo para esta conta e OS."; return; }
      if (draft.confirmedRecordId) { status.textContent = `Cópia confirmada: ${draft.confirmedRecordId}. Não reeditada; consulte a OS online ou tente confirmar novamente o recibo.`; return; }
      if (!draftMatches(draft, ownerId, ticket.id, ticket.version, ticket.checklist)) { status.textContent = "Rascunho de versão/checklist diferente. Preservado; consulte online. Não será sobrescrito aqui."; return; }
      if (!access() || !window.confirm("Substituir os campos não salvos pelo rascunho local, sem envio ao servidor?")) return;
      domain.value = draft.faultDomain; diagnosis.value = draft.diagnosis; solution.value = draft.solution;
      for (const [code, input] of answers) input.checked = draft.answers[code];
      revision = draft.revision; status.textContent = `Rascunho reaberto: ${draft.updatedAt}. Ainda não registrado no servidor.`;
    } catch { status.textContent = "Não foi possível ler. Se a senha local mudou, restaure online com a senha original."; }
    finally { saving = false; restore.disabled = false; }
  });
  const submit = node("button", "Salvar rascunho neste dispositivo"); submit.type = "submit";
  const sync = node("button", "Sincronizar rascunho salvo"); sync.type = "button";
  sync.addEventListener("click", async () => {
    const current = access(); if (saving || !current) return;
    if (!navigator.onLine) { status.textContent = "Sem conexão. Rascunho preservado; salve as alterações antes de reconectar."; return; }
    if (!window.confirm("Enviar somente a cópia SALVA? Campos não salvos não serão enviados. A confirmação bloqueará e invalidará a agenda; salve todos os rascunhos antes. Falha fora de cabeamento muda a OS para fora do escopo.")) return;
    saving = true; sync.disabled = true;
    const controls = Array.from(form.elements) as (HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement)[];
    controls.forEach((control) => { control.disabled = true; });
    try {
      const receipt = await syncSavedExecution(ownerId, ticket.id, current.password, (payload) => fetch("/api/executions", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(20_000) }));
      await confirmed(receipt.recordId, receipt.marked);
    } catch (error) { status.textContent = error instanceof Error ? error.message : "Sem confirmação. Rascunho preservado."; }
    finally { saving = false; sync.disabled = false; controls.forEach((control) => { control.disabled = false; }); }
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault(); const current = access(); if (saving || !current) return;
    if (Date.now() - Date.parse(current.fetchedAt) > 8 * 60 * 60_000) { status.textContent = "Agenda expirada. Atualize online; rascunhos salvos foram preservados."; return; }
    if (revision && !window.confirm("Substituir o rascunho anterior pelos campos atuais? A cópia anterior não poderá ser recuperada.")) return;
    saving = true; submit.disabled = true;
    try {
      revision = await saveExecutionDraft({ ownerId, ticketId: ticket.id, ticketNumber: ticket.ticket_number, title: ticket.title, version: ticket.version, updatedAt: new Date().toISOString(), faultDomain: domain.value as (typeof faultDomains)[number], diagnosis: diagnosis.value, solution: solution.value, items: ticket.checklist, answers: Object.fromEntries(Array.from(answers, ([code, input]) => [code, input.checked])) }, current.password, revision);
      status.textContent = "Rascunho salvo localmente. Nada enviado ao servidor. Quando conectar, sincronize a cópia salva ou restaure e revise online.";
    } catch { status.textContent = "Rascunho não salvo. Pode haver cópia anterior ou alteração em outra aba: reabra antes de substituir. Verifique o armazenamento e os limites dos campos."; }
    finally { saving = false; submit.disabled = false; }
  });
  form.append(domainLabel, diagnosisLabel, solutionLabel, fieldset, consentLabel, submit); container.append(restore, form, sync, status); return container;
}
