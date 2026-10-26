"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import Image from "next/image";
import { appendFieldEvent } from "@/lib/demo/field-events";
import { DemoModeBanner } from "@/components/demo-mode-banner";

type Step = "A caminho" | "No local" | "Finalizado";
type VisitState = "Fila de despacho" | "Despachado" | "Em deslocamento" | "Check-in" | "Em atendimento" | "Check-out" | "Aguardando validação do gestor" | "Concluído";
type Material = { id: string; description: string; quantity: number; unitPrice: number };
type Visit = { ticket: string; title: string; customer?: string; company?: string; department?: string; address: string; technician: string; window: string; plannedAt?: string; travelStartedAt?: string; state: VisitState; checkedInAt?: string; checkedOutAt?: string; technicianCompletedAt?: string; notes?: string; localContact?: string; localPhone?: string; technicalResolution?: string; serviceResult?: "Resolvido" | "Resolvido parcialmente" | "Não resolvido" | "Atendimento impossibilitado"; additionalNotes?: string; evidenceNotes?: string; evidenceCount?: number; photoCount?: number; evidenceFiles?: string[]; materials?: Material[]; customerSignatureName?: string; signatureDataUrl?: string; signedAt?: string; };

const fallbackVisit: Visit = { ticket: "INC-0142", title: "VPN indisponível para operação comercial", customer: "Unidade Comercial Centro", address: "Rua das Flores, 220 · São Paulo", technician: "Felipe Buso", window: "09:00 — 10:00", state: "Despachado" };
const visitToStep = (state: VisitState): Step => state === "Concluído" || state === "Check-out" ? "Finalizado" : state === "Check-in" || state === "Em atendimento" ? "No local" : "A caminho";

export default function TechnicianMobileDemo() {
  const [step, setStep] = useState<Step>("A caminho");
  const [notes, setNotes] = useState("");
  const [serviceResult, setServiceResult] = useState<Visit["serviceResult"]>(undefined);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [signatureName, setSignatureName] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState("");
  const [signed, setSigned] = useState(false);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [signatureReady, setSignatureReady] = useState(false);
  const signatureCanvas = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [lpuItems, setLpuItems] = useState<Material[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [evidence, setEvidence] = useState(0);
  const [materialQuantity, setMaterialQuantity] = useState("1");
  const [notice, setNotice] = useState("Atendimento pronto para iniciar.");
  const [visit, setVisit] = useState<Visit>(fallbackVisit);
  const [online, setOnline] = useState(true);
  const [lastSyncAt, setLastSyncAt] = useState("");
  useEffect(() => {
    const initialTimer = window.setTimeout(() => setOnline(navigator.onLine), 0);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.clearTimeout(initialTimer); window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { try {
      const activeTicket = window.localStorage.getItem("oneit.demo.field-active-ticket");
      const visits = JSON.parse(window.localStorage.getItem("oneit.demo.field-visits.v1") ?? "[]") as Visit[];
      const selected = visits.find((item) => item.ticket === activeTicket) ?? visits[0];
      if (selected) {
        const normalized = { ...selected, address: selected.address === "Local a confirmar" ? fallbackVisit.address : selected.address, customer: selected.customer === "Contato não informado" ? fallbackVisit.customer : selected.customer };
        setVisit(normalized);
        setStep(visitToStep(selected.state));
        setNotes(selected.notes ?? "");
        setServiceResult(selected.serviceResult);
        setAdditionalNotes(selected.additionalNotes ?? "");
        setSignatureName(selected.customerSignatureName ?? "");
        setSignatureDataUrl(selected.signatureDataUrl ?? "");
        setSigned(Boolean(selected.signedAt) && selected.state !== "Em atendimento");
        setEvidence(selected.evidenceCount ?? selected.photoCount ?? 0);
      }
      const lpu = JSON.parse(window.localStorage.getItem("oneit.demo.field-lpu.v1") ?? "[]") as Array<{ id: string; code: string; description: string; unit?: string; price: number; active: boolean }>;
      if (Array.isArray(lpu)) setLpuItems(lpu.filter((item) => item.active).map((item) => ({ id: item.id, description: item.code + " · " + item.description + (item.unit ? " (" + item.unit + ")" : ""), quantity: 0, unitPrice: 0 })));
    } catch {
      // A visita de demonstração permanece disponível caso a agenda local esteja vazia.
    } }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="file"][accept="image/*"]'));
    const onEvidenceChange = (event: Event) => {
      const files = Array.from((event.target as HTMLInputElement).files ?? []);
      if (!files.length) return;
      void Promise.all(files.slice(0, 8).map((file) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : ""); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); }))).then((dataUrls) => {
        const validUrls = dataUrls.filter(Boolean);
        if (!validUrls.length) return;
        try {
          const storageKey = "oneit.demo.field-visits.v1";
          const stored = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as Array<Record<string, unknown>>;
          const visits = Array.isArray(stored) ? stored : [];
          const current = (visits.find((item) => item.ticket === visit.ticket) ?? visit) as Visit & Record<string, unknown>;
          const previous = Array.isArray(current.evidenceDataUrls) ? current.evidenceDataUrls as string[] : [];
          const next = { ...current, evidenceDataUrls: [...previous, ...validUrls].slice(0, 8) };
          window.localStorage.setItem(storageKey, JSON.stringify(visits.some((item) => item.ticket === visit.ticket) ? visits.map((item) => item.ticket === visit.ticket ? next : item) : [...visits, next]));
          setVisit((value) => ({ ...value, evidenceDataUrls: [...previous, ...validUrls].slice(0, 8) }));
        } catch { /* O nome/quantidade da evidência continua salvo pelo fluxo principal. */ }
      });
    };
    inputs.forEach((input) => input.addEventListener("change", onEvidenceChange));
    return () => inputs.forEach((input) => input.removeEventListener("change", onEvidenceChange));
  // A troca de ticket recria o listener; o objeto `visit` é usado apenas como fallback do registro local.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visit.ticket]);
  const allowedTransitions: Record<VisitState, VisitState[]> = { "Fila de despacho": ["Despachado"], "Despachado": ["Em deslocamento"], "Em deslocamento": ["Check-in"], "Check-in": ["Em atendimento"], "Em atendimento": ["Check-out", "Aguardando validação do gestor"], "Check-out": ["Aguardando validação do gestor"], "Aguardando validação do gestor": ["Concluído", "Em atendimento"], "Concluído": [] };
  const recordStateEvent = (previous: VisitState, next: VisitState, details: string) => {
    if (previous === next) return;
    try {
      appendFieldEvent({ ticket: visit.ticket, from: previous, to: next, actor: visit.technician || "Técnico autenticado", details });
      addTicketHistory("Estado da OS alterado: " + previous + " → " + next + ".");
    } catch { /* O histórico visual continua disponível mesmo se o cache de auditoria falhar. */ }
  };
  const persistVisit = (state: VisitState, details: Partial<Visit> = {}) => {
    if (state !== visit.state && !allowedTransitions[visit.state]?.includes(state)) {
      setNotice("Transição não permitida: " + visit.state + " → " + state + ".");
      return;
    }
    const updated = { ...visit, state, ...details };
    recordStateEvent(visit.state, state, "Transição operacional registrada no dispositivo do técnico.");
    setVisit(updated);
    try {
      const stored = JSON.parse(window.localStorage.getItem("oneit.demo.field-visits.v1") ?? "[]") as Visit[];
      const visits = Array.isArray(stored) ? (stored.some((item) => item.ticket === updated.ticket) ? stored.map((item) => item.ticket === updated.ticket ? updated : item) : [...stored, updated]) : [updated];
      window.localStorage.setItem("oneit.demo.field-visits.v1", JSON.stringify(visits));
      setLastSyncAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    } catch {
      window.localStorage.setItem("oneit.demo.field-visits.v1", JSON.stringify([updated]));
      setLastSyncAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    }
  };
  const addTicketHistory = (text: string) => {
    try {
      const stored = JSON.parse(window.localStorage.getItem("oneit.demo.tickets.v1") ?? "{}") as { timeline?: Record<string, Array<{ at: string; text: string; kind: "cliente" | "interna" }>> };
      const timeline = stored.timeline ?? {};
      timeline[visit.ticket] = [{ at: "Agora", text, kind: "interna" }, ...(timeline[visit.ticket] ?? [])];
      window.localStorage.setItem("oneit.demo.tickets.v1", JSON.stringify({ ...stored, timeline }));
    } catch {
      // O atendimento continua registrado na agenda mesmo se o histórico local estiver indisponível.
    }
  };
  const syncTicketForValidation = (updated: Visit) => {
    try {
      const stored = JSON.parse(window.localStorage.getItem("oneit.demo.tickets.v1") ?? "{}") as { tickets?: Array<Record<string, unknown>>; timeline?: Record<string, Array<{ at: string; text: string; kind: "cliente" | "interna" }>> };
      const generatedAt = new Date().toISOString();
      const report = { status: "gerado" as const, fileName: "RTO-" + updated.ticket + ".pdf", generatedAt, summary: updated.technicalResolution ?? updated.notes ?? "", signatureCaptured: Boolean(updated.signatureDataUrl), signatureName: updated.customerSignatureName, signatureDataUrl: updated.signatureDataUrl };
      const tickets = (stored.tickets ?? []).map((ticket) => ticket.id === updated.ticket ? { ...ticket, status: "Pendente validação", fieldStatus: "Aguardando validação do gestor", fieldVisitId: "field-" + updated.ticket, fieldReport: report, fieldMaterialTotal: (updated.materials ?? []).reduce((sum, item) => sum + item.quantity * item.unitPrice, 0), resolution: updated.technicalResolution ?? updated.notes } : ticket);
      window.localStorage.setItem("oneit.demo.tickets.v1", JSON.stringify({ ...stored, tickets }));
    } catch {
      // A fila da OS continua persistida mesmo se o chamado ainda não existir na demo local.
    }
  };
  const startTravel = () => { const travelStartedAt = new Date().toISOString(); persistVisit("Em deslocamento", { travelStartedAt }); addTicketHistory("Técnico iniciou o deslocamento para o atendimento de campo em " + new Date(travelStartedAt).toLocaleString("pt-BR") + "."); setNotice("Deslocamento iniciado. Faça o check-in ao chegar ao local."); };
  const checkIn = () => { const checkedInAt = new Date().toISOString(); setStep("No local"); persistVisit("Check-in", { checkedInAt }); addTicketHistory("Técnico realizou check-in no local em " + new Date(checkedInAt).toLocaleString("pt-BR") + "."); setNotice("Chegada registrada. Inicie o atendimento quando estiver pronto."); };
  const startService = () => { persistVisit("Em atendimento"); addTicketHistory("Técnico iniciou o atendimento no local."); setNotice("Atendimento iniciado. Registre a solução e as evidências."); };
  const checkOut = () => { if (!signed) { setNotice("Colete o aceite do cliente antes de fazer check-out."); return; } const technicianCompletedAt = new Date().toISOString(); const completed = { ...visit, state: "Aguardando validação do gestor" as VisitState, checkedOutAt: technicianCompletedAt, technicianCompletedAt, customerSignatureName: signatureName.trim(), signatureDataUrl, signedAt: visit.signedAt ?? technicianCompletedAt, notes: notes.trim(), technicalResolution: notes.trim(), serviceResult, additionalNotes: additionalNotes.trim(), evidenceNotes: additionalNotes.trim(), evidenceCount: evidence, photoCount: evidence }; setStep("Finalizado"); persistVisit("Aguardando validação do gestor", completed); syncTicketForValidation(completed); addTicketHistory("Técnico realizou check-out e encaminhou automaticamente a OS para validação do gestor em " + new Date(technicianCompletedAt).toLocaleString("pt-BR") + "."); setNotice("OS encerrada pelo técnico e enviada automaticamente à fila de validação do gestor."); };
  const saveDraft = () => {
    if (!notes.trim() && !additionalNotes.trim()) { setNotice("Digite ao menos uma observação para salvar o rascunho."); return; }
    persistVisit(step === "No local" ? "Em atendimento" : visit.state, { notes: notes.trim(), technicalResolution: notes.trim(), serviceResult, additionalNotes: additionalNotes.trim(), evidenceNotes: additionalNotes.trim(), evidenceCount: evidence, photoCount: evidence });
    addTicketHistory("Rascunho do atendimento salvo pelo técnico.");
    setNotice("Rascunho salvo. Você poderá continuar o preenchimento depois.");
  };
  const addMaterial = () => {
    const quantity = Number(materialQuantity);
    if (!selectedMaterial || !Number.isFinite(quantity) || quantity <= 0) { setNotice("Selecione um material e informe a quantidade utilizada."); return; }
    const catalogItem = lpuItems.find((item) => item.id === selectedMaterial);
    if (!catalogItem) { setNotice("Selecione um item cadastrado na LPU."); return; }
    const existing = (visit.materials ?? []).find((item) => item.description === catalogItem.description);
    const materials = existing ? (visit.materials ?? []).map((item) => item.description === catalogItem.description ? { ...item, quantity: item.quantity + quantity } : item) : [...(visit.materials ?? []), { id: "material-" + Date.now(), description: catalogItem.description, quantity, unitPrice: 0 }];
    persistVisit(visit.state, { materials });
    setSelectedMaterial("");
    setMaterialQuantity("1");
    setNotice("Material registrado. O gestor aplicará a precificação na validação da OS.");
  };
  const canvasPoint = (event: PointerEvent<HTMLCanvasElement>) => { const canvas = signatureCanvas.current; if (!canvas) return [0, 0] as const; const rect = canvas.getBoundingClientRect(); return [(event.clientX - rect.left) * (canvas.width / rect.width), (event.clientY - rect.top) * (canvas.height / rect.height)] as const; };
  const startSignature = (event: PointerEvent<HTMLCanvasElement>) => { const canvas = signatureCanvas.current; if (!canvas) return; const context = canvas.getContext("2d"); if (!context) return; const [x, y] = canvasPoint(event); drawing.current = true; context.beginPath(); context.moveTo(x, y); canvas.setPointerCapture(event.pointerId); };
  const drawSignature = (event: PointerEvent<HTMLCanvasElement>) => { if (!drawing.current) return; const canvas = signatureCanvas.current; const context = canvas?.getContext("2d"); if (!canvas || !context) return; const [x, y] = canvasPoint(event); context.lineWidth = 3; context.lineCap = "round"; context.strokeStyle = "#092f40"; context.lineTo(x, y); context.stroke(); setSignatureReady(true); };
  const clearSignature = () => { const canvas = signatureCanvas.current; const context = canvas?.getContext("2d"); if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height); setSignatureReady(false); };
  const signVisit = () => {
    if (!notes.trim() || !serviceResult) { setNotice("Preencha serviço executado e resultado antes da assinatura."); return; }
    if (!signatureName.trim()) { setNotice("Informe o nome do responsável pelo aceite."); return; }
    if (!signatureReady || !signatureCanvas.current) { setNotice("Desenhe a assinatura no quadro antes de confirmar."); return; }
    const signedAt = new Date().toISOString();
    const signatureDataUrl = signatureCanvas.current.toDataURL("image/png");
    setSignatureDataUrl(signatureDataUrl);
    setSigned(true);
    const signatureDetails = { customerSignatureName: signatureName.trim(), signatureDataUrl, signedAt, notes: notes.trim(), technicalResolution: notes.trim(), serviceResult, additionalNotes: additionalNotes.trim(), evidenceNotes: additionalNotes.trim(), evidenceCount: evidence, photoCount: evidence };
    persistVisit("Check-out", signatureDetails);
    try {
      const stored = JSON.parse(window.localStorage.getItem("oneit.demo.field-visits.v1") ?? "[]") as Visit[];
      const saved = { ...visit, ...signatureDetails, state: "Check-out" as VisitState };
      window.localStorage.setItem("oneit.demo.field-visits.v1", JSON.stringify(Array.isArray(stored) ? stored.map((item) => item.ticket === visit.ticket ? saved : item) : [saved]));
    } catch { /* A atualização visual permanece ativa se o armazenamento estiver indisponível. */ }
    setSignatureOpen(false);
    setNotice("Aceite registrado. A OS está bloqueada para edição; prossiga para encerrar.");
  };
  const sendForValidation = () => {
    if (!notes.trim() || !serviceResult) { setNotice("Registre o serviço e o resultado antes de enviar a OS ao gestor."); return; }
    if (!signed) { setNotice("Colete o aceite do cliente antes de encerrar a OS."); return; }
    if (step !== "Finalizado") { setNotice("Faça o check-out no local antes de enviar a OS para validação."); return; }
    const updated = { ...visit, state: "Aguardando validação do gestor" as VisitState, notes: notes.trim(), technicalResolution: notes.trim(), evidenceCount: evidence, photoCount: evidence };
    persistVisit("Aguardando validação do gestor", { notes: notes.trim(), technicalResolution: notes.trim(), evidenceCount: evidence, photoCount: evidence });
    syncTicketForValidation(updated);
    addTicketHistory("OS de campo concluída pelo técnico e encaminhada para validação do gestor.");
    setNotice("OS enviada para a fila de validação do gestor. Aguarde a conferência de evidências e precificação.");
  };
  const stepClass = step === "Finalizado" ? "bg-emerald-100 text-emerald-800" : step === "No local" ? "bg-cyan-100 text-cyan-800" : "bg-amber-100 text-amber-800";

  return <main className="min-h-screen bg-slate-100 px-4 py-5 text-slate-900 sm:px-8"><DemoModeBanner />
    <div className="mx-auto max-w-md overflow-hidden rounded-2xl border bg-white shadow-xl shadow-slate-900/10">
      <header className="bg-[#092f40] px-5 py-5 text-white"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><Image src="/oneit-logo-field.png" alt="ONEIT" width={210} height={76} priority className="h-14 w-auto max-w-[210px] object-contain object-left" /><h1 className="mt-2 text-lg font-semibold">Minha visita</h1><p className="text-xs text-cyan-100">Field Service</p></div><span className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">Técnico</span></div></header>
      <div className="space-y-5 p-5">
        <div className={online ? "rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800" : "rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800"}>{online ? "● Online · sincronização ativa" : "● Offline · dados serão sincronizados quando a conexão voltar"}{lastSyncAt && <span className="ml-2 font-normal">Último registro: {lastSyncAt}</span>}</div>
        <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chamado</p><p className="mt-1 font-semibold text-[#0b4a64]">{visit.ticket}</p></div><span className={"rounded-full px-3 py-1 text-xs font-semibold " + stepClass}>{step}</span></div><div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Progresso do atendimento</p><div className="mt-3 flex items-center gap-1">{["Despachado", "Em deslocamento", "Check-in", "Em atendimento", "Aguardando validação do gestor"].map((state, index) => <span key={state} title={state} className={index <= ["Despachado", "Em deslocamento", "Check-in", "Em atendimento", "Aguardando validação do gestor"].indexOf(visit.state) ? "h-2 flex-1 rounded-full bg-orange-500" : "h-2 flex-1 rounded-full bg-slate-200"} />)}</div><p className="mt-2 text-xs text-slate-600">Etapa atual: <strong>{visit.state}</strong></p></div>
        <div><h2 className="text-lg font-semibold">{visit.title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{visit.company || visit.customer || "Empresa não informada"} · {visit.department || "Local de atendimento"}</p><div className="mt-3 rounded-xl border border-cyan-200 bg-cyan-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-cyan-800">Local do atendimento</p><p className="mt-1 text-sm font-medium text-slate-900">{visit.address || "Endereço não informado"}</p><a href={visit.address ? "https://waze.com/ul?q=" + encodeURIComponent(visit.address) + "&navigate=yes" : undefined} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-cyan-800">Abrir rota no Waze ↗</a></div><div className="mt-3 rounded-xl border bg-white p-3 text-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pessoa de contato</p><p className="mt-1 font-medium">{visit.localContact || visit.customer || "Contato não informado"}</p>{visit.localPhone && <a href={"tel:" + visit.localPhone} className="mt-1 inline-block font-semibold text-[#0b4a64]">Ligar para {visit.localPhone}</a>}</div></div>
        <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Janela de atendimento</p><p className="mt-1 font-semibold">{visit.window}</p><p className="mt-1 text-sm text-slate-600">Técnico responsável: {visit.technician}</p></div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Próxima ação</p>{visit.state === "Despachado" && <button type="button" onClick={startTravel} className="mt-2 w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white">Iniciar deslocamento</button>}{visit.state === "Em deslocamento" && <button type="button" onClick={checkIn} className="mt-2 w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white">Confirmar chegada ao local</button>}{visit.state === "Check-in" && !signed && <button type="button" onClick={startService} className="mt-2 w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white">Iniciar atendimento</button>}{visit.state === "Em atendimento" && !signed && <p className="mt-2 text-sm text-orange-900">Registre o serviço, resultado e evidências. Depois colete o aceite do cliente.</p>}{signed && visit.state !== "Aguardando validação do gestor" && <button type="button" onClick={checkOut} className="mt-2 w-full rounded-xl bg-[#092f40] px-4 py-3 text-sm font-semibold text-white">Fazer check-out e encerrar OS</button>}</div>
        <div className="border-t pt-5"><label className="text-sm font-semibold">Serviço executado<textarea disabled={signed} value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-2 min-h-28 w-full rounded-xl border p-3 text-sm disabled:bg-slate-100" placeholder="Descreva o diagnóstico e o serviço realizado..." /></label><label className="mt-3 block text-sm font-semibold">Resultado<select disabled={signed} value={serviceResult ?? ""} onChange={(event) => setServiceResult(event.target.value as Visit["serviceResult"])} className="mt-1 w-full rounded-xl border p-3 text-sm disabled:bg-slate-100"><option value="">Selecione o resultado</option><option>Resolvido</option><option>Resolvido parcialmente</option><option>Não resolvido</option><option>Atendimento impossibilitado</option></select></label><label className="mt-3 block text-sm font-semibold">Observações adicionais<textarea disabled={signed} value={additionalNotes} onChange={(event) => setAdditionalNotes(event.target.value)} className="mt-2 min-h-20 w-full rounded-xl border p-3 text-sm disabled:bg-slate-100" placeholder="Informações complementares (opcional)" /></label></div>
        <div className="rounded-xl border border-dashed border-slate-300 p-4"><div className="flex items-center justify-between gap-2"><div><p className="text-sm font-semibold">Fotos e evidências</p><p className="mt-1 text-xs text-slate-500">{evidence} evidência(s) vinculada(s)</p></div><div className="flex gap-2"><label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Galeria<input disabled={signed} type="file" accept="image/*" multiple className="hidden" onChange={(event) => { const files = Array.from(event.target.files ?? []); if (!files.length) return; const names = [...(visit.evidenceFiles ?? []), ...files.map((file) => file.name)]; const nextEvidence = names.length; setEvidence(nextEvidence); persistVisit(visit.state, { evidenceCount: nextEvidence, photoCount: nextEvidence, evidenceFiles: names }); setNotice(files.length + " foto(s) adicionada(s) da galeria."); }} /></label><label className="cursor-pointer rounded-lg bg-[#092f40] px-3 py-2 text-xs font-semibold text-white">Abrir câmera<input disabled={signed} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { const files = Array.from(event.target.files ?? []); if (!files.length) return; const names = [...(visit.evidenceFiles ?? []), ...files.map((file) => file.name)]; const nextEvidence = names.length; setEvidence(nextEvidence); persistVisit(visit.state, { evidenceCount: nextEvidence, photoCount: nextEvidence, evidenceFiles: names }); setNotice("Foto capturada e adicionada às evidências."); }} /></label></div></div>{visit.evidenceFiles?.length ? <ul className="mt-3 space-y-1 text-xs text-slate-600">{visit.evidenceFiles.map((file) => <li key={file} className="flex items-center justify-between gap-2"><span>📷 {file}</span>{!signed && <button type="button" onClick={() => { const names = (visit.evidenceFiles ?? []).filter((item) => item !== file); setEvidence(names.length); persistVisit(visit.state, { evidenceCount: names.length, photoCount: names.length, evidenceFiles: names }); }} className="text-xs font-semibold text-red-700">Remover</button>}</li>)}</ul> : null}</div>
        <div className="rounded-xl border border-slate-200 p-4"><p className="text-sm font-semibold">Materiais utilizados · LPU</p><p className="mt-1 text-xs text-slate-500">Selecione apenas itens cadastrados. O técnico não edita preço.</p><div className="mt-3 grid grid-cols-[1fr_72px] gap-2"><select disabled={signed} value={selectedMaterial} onChange={(event) => setSelectedMaterial(event.target.value)} className="rounded-lg border px-3 py-2 text-sm"><option value="">Selecionar material</option>{lpuItems.map((item) => <option key={item.id} value={item.id}>{item.description}</option>)}</select><input disabled={signed} value={materialQuantity} onChange={(event) => setMaterialQuantity(event.target.value)} type="number" min="0.01" step="0.01" className="rounded-lg border px-3 py-2 text-sm" /></div><button type="button" disabled={signed} onClick={addMaterial} className="mt-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:bg-slate-100">Adicionar material</button>{visit.materials?.length ? <ul className="mt-3 space-y-1 text-xs text-slate-600">{visit.materials.map((item) => <li key={item.id}>{item.description} · {item.quantity}</li>)}</ul> : null}</div>
        {!signed && <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4"><p className="text-sm font-semibold text-cyan-950">Aceite do cliente</p><p className="mt-1 text-xs text-cyan-900">Informe quem acompanhou e abra o quadro para assinar com o dedo.</p><input value={signatureName} onChange={(event) => setSignatureName(event.target.value)} placeholder="Nome do responsável pelo aceite" className="mt-3 w-full rounded-lg border bg-white px-3 py-2 text-sm" /><button type="button" onClick={() => setSignatureOpen(true)} className="mt-2 w-full rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white">Abrir assinatura</button></div>}{signed && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm font-semibold text-emerald-900">Aceite confirmado</p><p className="mt-1 text-xs text-emerald-800">{signatureName} · OS bloqueada para edição. Faça o check-out para encaminhar ao gestor.</p></div>}
        <p aria-live="polite" className="rounded-lg bg-cyan-50 p-3 text-sm leading-5 text-cyan-900">{notice}</p>
        {step !== "Finalizado" && visit.state !== "Aguardando validação do gestor" && visit.state !== "Concluído" && <button type="button" onClick={saveDraft} className="w-full rounded-xl border border-orange-300 px-4 py-3 text-sm font-semibold text-orange-800">Salvar rascunho do atendimento</button>}
        {visit.state !== "Aguardando validação do gestor" && visit.state !== "Concluído" && step === "Finalizado" && signed && <button type="button" onClick={sendForValidation} className="w-full rounded-xl bg-[#092f40] px-4 py-3 text-sm font-semibold text-white">Enviar OS para validação do gestor</button>}
      </div>
    </div>
    {signatureOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Aceite do cliente</p><h2 className="mt-1 text-lg font-semibold">Assine na tela</h2></div><button type="button" onClick={() => setSignatureOpen(false)} className="text-xl text-slate-500">×</button></div><p className="mt-2 text-sm text-slate-600">Use o dedo para assinar no quadro abaixo.</p><canvas ref={signatureCanvas} width={720} height={320} onPointerDown={startSignature} onPointerMove={drawSignature} onPointerUp={() => { drawing.current = false; }} onPointerCancel={() => { drawing.current = false; }} className="mt-4 h-48 w-full touch-none rounded-xl border-2 border-dashed border-slate-300 bg-white" /><div className="mt-4 flex justify-between gap-2"><button type="button" onClick={clearSignature} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Limpar</button><button type="button" onClick={signVisit} className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white">✓ Confirmar assinatura</button></div></div></div>}
  </main>;
}

