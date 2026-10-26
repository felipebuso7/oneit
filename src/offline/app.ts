import { invalidateAgenda, loadVault, unlockAgenda, type LocalAgenda } from "../lib/offline/agenda";
import * as queue from "../lib/offline/queue";
import { syncEvents } from "../lib/offline/sync";
import { executionDraftForm } from "./execution-form";
import { listExecutionDrafts, removeExecutionDraft } from "../lib/offline/execution-draft";
import { syncSavedExecution } from "../lib/offline/execution-sync";

const root = document.getElementById("local-agenda")!;
const notice = document.getElementById("notice")!;
let agenda: LocalAgenda | undefined;
let localSecret = "";
let busy = false;
let lockTimer: number | undefined;
const actions = { ASSIGNED: ["TRAVEL_STARTED", "Iniciar deslocamento"], TRAVEL_STARTED: ["ARRIVAL", "Registrar chegada"], ON_SITE: ["WORK_STARTED", "Iniciar atendimento"] } as const;

function node<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) {
  const value = document.createElement(tag);
  if (text) value.textContent = text;
  return value;
}
function message(text: string) { notice.textContent = text; }
function button(text: string, handler: () => void) {
  const value = node("button", text); value.type = "button"; value.addEventListener("click", handler); return value;
}
function lock() {
  agenda = undefined;
  localSecret = "";
  if (lockTimer) window.clearTimeout(lockTimer);
  showUnlock();
  message("Agenda local bloqueada. Check-ins e rascunhos salvos foram preservados. Alterações não salvas não são recuperáveis.");
}
function resetLockTimer() {
  if (lockTimer) window.clearTimeout(lockTimer);
  if (agenda) lockTimer = window.setTimeout(lock, 5 * 60_000);
}

function showUnlock() {
  root.replaceChildren();
  const form = node("form");
  const label = node("label", "Senha local da agenda (não é a senha do login)");
  const password = node("input"); password.type = "password"; password.required = true; password.minLength = 12; password.maxLength = 200; password.autocomplete = "off";
  label.append(password);
  const submit = node("button", "Desbloquear agenda local"); submit.type = "submit";
  form.append(label, submit);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    busy = true; submit.disabled = true;
    const secret = password.value; password.value = "";
    try {
      const vault = await loadVault();
      if (!vault) { message("Nenhuma agenda preparada neste dispositivo. Conecte, entre em Campo e salve uma cópia primeiro."); return; }
      const unlocked = await unlockAgenda(vault, secret);
      if (document.hidden) { message("Desbloqueio cancelado porque a tela ficou oculta. Tente novamente."); return; }
      agenda = unlocked;
      localSecret = secret;
      message("Cópia local desbloqueada. A atribuição e a etapa atuais só serão verificadas pelo servidor ao sincronizar.");
      await renderAgenda(); resetLockTimer();
    } catch {
      agenda = undefined;
      localSecret = "";
      message("Não foi possível desbloquear: senha incorreta, cópia inválida/expirada ou relógio divergente. Atualize online em Campo. A fila de check-ins não foi apagada.");
    } finally { busy = false; submit.disabled = false; }
  });
  root.append(form);
}

function checkIn(ticket: LocalAgenda["tickets"][number], ownerId: string) {
  const action = actions[ticket.operational_status as keyof typeof actions];
  if (!action) return node("p", "Checklist, materiais, fotos e conclusão ainda exigem a tela online.");
  const form = node("form");
  let position: { latitude: number; longitude: number; accuracy: number } | undefined;
  const gpsStatus = node("p", "Colete GPS ou justifique sua ausência.");
  const reasonLabel = node("label", "Justificativa sem GPS");
  const reason = node("textarea"); reason.required = true; reason.minLength = 10; reason.maxLength = 1000; reasonLabel.append(reason);
  const locate = button("Coletar localização", () => {
    if (!navigator.geolocation) { gpsStatus.textContent = "GPS indisponível. Informe uma justificativa."; return; }
    locate.disabled = true;
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      position = { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy };
      reason.required = false; gpsStatus.textContent = `GPS coletado. Precisão: ${Math.round(coords.accuracy)} m.`; locate.disabled = false;
    }, () => { gpsStatus.textContent = "GPS indisponível. Informe uma justificativa."; locate.disabled = false; }, { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 });
  });
  const consentLabel = node("label", "Autorizo guardar este check-in (OS, GPS e justificativa) no dispositivo até confirmação.");
  const consent = node("input"); consent.type = "checkbox"; consent.required = true; consentLabel.prepend(consent);
  const submit = node("button", `${action[1]} — salvar na fila`); submit.type = "submit";
  let saving = false;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (saving || !agenda) return;
    if (Date.now() - Date.parse(agenda.fetchedAt) > 8 * 60 * 60_000) { lock(); message("Agenda expirada. Atualize online em Campo."); return; }
    saving = true; submit.disabled = true;
    try {
      await queue.enqueueEvent({ id: crypto.randomUUID(), ownerId, ticketId: ticket.id, version: ticket.version,
        eventType: action[0], capturedAt: new Date().toISOString(), ...position, justification: position ? undefined : reason.value });
      message("Check-in guardado localmente. Ainda não registrado no servidor. Aguarde confirmação antes de qualquer nova etapa.");
      submit.textContent = "Check-in guardado na fila";
    } catch { message("Não foi possível guardar o check-in. Confira se esta OS já tem evento na fila e se o armazenamento está disponível."); }
    finally { saving = false; submit.disabled = submit.textContent === "Check-in guardado na fila"; }
  });
  form.append(locate, gpsStatus, reasonLabel, consentLabel, submit);
  return form;
}

async function renderAgenda() {
  const current = agenda;
  if (!current) return;
  const events = await queue.listEvents(current.ownerId);
  if (agenda !== current) return;
  root.replaceChildren();
  root.append(node("h2", "Agenda local — cópia, não estado atual"), node("p", `Última consulta online: ${current.fetchedAt}. Válida por 8 horas. Até 50 OS; não representa todos os chamados.`));
  root.append(button("Bloquear agenda", lock));
  const sync = button("Tentar sincronizar check-ins", async () => {
    if (busy) return;
    if (!navigator.onLine) { message("Dispositivo sem conexão. Check-ins preservados."); return; }
    if (!window.confirm("Sincronizar check-ins? A confirmação bloqueia e invalida a agenda. Salve antes os rascunhos; alterações não salvas serão perdidas.")) return;
    busy = true; sync.disabled = true;
    try {
      const count = await syncEvents(current.ownerId, queue, (payload) => fetch("/api/field-events", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(20_000) }), Date.now(), true);
      if (count) {
        // A confirmed transition makes the saved versions stale. Invalidate the copy, never the queue.
        await invalidateAgenda(current.ownerId); lock();
        message(`${count} evento(s) confirmado(s). A cópia da agenda foi invalidada para evitar usar etapas antigas. Atualize online em Campo. Outros eventos da fila foram preservados.`);
      } else {
        message("Nenhum evento confirmado. Confira os estados da fila; talvez seja necessário entrar novamente na mesma conta.");
        const pending = await queue.listEvents(current.ownerId);
        message(`Nenhum evento confirmado. Fila: ${pending.map((event) => `${event.payload.eventType}: ${event.status}`).join("; ") || "vazia"}. Formulários abertos foram preservados.`);
      }
    } catch { message("Sem confirmação. A fila foi preservada; tente novamente com conexão."); }
    finally { busy = false; sync.disabled = false; }
  });
  root.append(sync, node("h3", `Check-ins desta conta (${events.length})`));
  for (const event of events) root.append(node("p", `${event.payload.eventType} · OS ${event.ticketId.slice(0, 8)} · ${event.status} — ${event.message ?? "Aguardando confirmação."}`));
  const recovered = await listExecutionDrafts(current.ownerId, localSecret);
  if (agenda !== current) return;
  const recovery = node("section");
  recovery.append(node("h3", `Rascunhos locais recuperáveis (${recovered.drafts.length})`), node("p", "Inclui cópias de OS que podem não aparecer mais nesta agenda. Nenhuma é enviada automaticamente; o servidor ainda valida atribuição, etapa e versão."));
  for (const draft of recovered.drafts) {
    const item = node("article");
    item.append(node("h4", `${draft.ticketNumber ?? "OS"} — ${draft.title ?? `identificador ${draft.ticketId.slice(0, 8)}`}`), node("p", `Salvo: ${draft.updatedAt}. ${draft.confirmedRecordId ? `Confirmação local: ${draft.confirmedRecordId}.` : "Sem confirmação local."}`));
    const resend = button(draft.confirmedRecordId ? "Conferir recibo no servidor" : "Sincronizar cópia salva", async () => {
      if (busy || !navigator.onLine) { message("Conexão indisponível. Rascunho preservado."); return; }
      if (!window.confirm("Enviar somente esta cópia salva? Campos não salvos não participam. Conflitos serão preservados para revisão.")) return;
      busy = true; resend.disabled = true;
      try {
        const receipt = await syncSavedExecution(current.ownerId, draft.ticketId, localSecret, (payload) => fetch("/api/executions", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(20_000) }));
        try { await invalidateAgenda(current.ownerId); } catch { /* The server receipt remains valid; show the conservative warning below. */ }
        lock(); message(`Execução confirmada: ${receipt.recordId}. Rascunho preservado; atualize Campo antes da próxima etapa.${receipt.marked ? "" : " A confirmação não foi marcada na cópia local; confira antes de editar."}`);
      } catch (error) { message(error instanceof Error ? error.message : "Sem confirmação. Rascunho preservado."); }
      finally { busy = false; resend.disabled = false; }
    });
    const remove = button("Excluir cópia local", async () => {
      if (busy || !window.confirm("Excluir permanentemente apenas esta cópia local? Isso não desfaz registros do servidor.")) return;
      busy = true; remove.disabled = true;
      try { await removeExecutionDraft(current.ownerId, draft.ticketId); await renderAgenda(); message("Cópia local removida. Nenhum registro do servidor foi alterado."); }
      catch { message("Não foi possível remover a cópia local."); }
      finally { busy = false; remove.disabled = false; }
    });
    item.append(resend, remove); recovery.append(item);
  }
  if (recovered.unreadable) recovery.append(node("p", `${recovered.unreadable} cópia(s) não foram abertas com esta senha e foram preservadas.`));
  if (recovered.skipped) recovery.append(node("p", `Mais ${recovered.skipped} cópia(s) não foram processadas neste dispositivo; nada foi removido.`));
  root.append(recovery);
  for (const ticket of current.tickets) {
    const card = node("article");
    card.append(node("h3", `${ticket.ticket_number} — ${ticket.title}`), node("p", `Etapa na cópia: ${ticket.operational_status}. Agenda: ${ticket.scheduled_at ?? "Sem horário"}.`));
    if (events.some((event) => event.ticketId === ticket.id)) card.append(node("p", "Há evento pendente desta OS. Não registre novamente; confira a fila online para tratar conflitos."));
    else card.append(checkIn(ticket, current.ownerId));
    if (["WORK_STARTED", "IN_PROGRESS"].includes(ticket.operational_status)) card.append(executionDraftForm(ticket, current.ownerId,
      () => agenda === current && localSecret ? { password: localSecret, fetchedAt: current.fetchedAt } : undefined,
      async (recordId, marked) => {
        let invalidated = true;
        try { await invalidateAgenda(current.ownerId); } catch { invalidated = false; }
        lock();
        message(`Execução confirmada: ${recordId}. Rascunho preservado. Atualize online antes da próxima etapa.${!marked ? " A confirmação não foi marcada localmente; confira a cópia antes de editar." : ""}${!invalidated ? " Agenda local não foi invalidada; não a reutilize sem atualizar." : ""}`);
      }));
    root.append(card);
  }
  if (!current.tickets.length) root.append(node("p", "A última consulta não trouxe OS atribuídas em execução."));
}

document.addEventListener("visibilitychange", () => { if (document.hidden && agenda) lock(); });
document.addEventListener("pointerdown", resetLockTimer);
document.addEventListener("keydown", resetLockTimer);
window.addEventListener("online", () => message("Rede disponível no dispositivo. Use sincronização ou volte à tela Campo; rede disponível não garante acesso ao servidor."));
showUnlock();
