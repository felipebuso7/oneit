"use client";
/* eslint-disable @next/next/no-img-element -- prévia local de foto enviada usa data URL no navegador. */

import { PointerEvent, ReactNode, useEffect, useRef, useState } from "react";
import Image from "next/image";

type Evidence = { name: string; storagePath?: string; mime?: "image/jpeg" | "image/png" | "image/webp"; size?: number; dataUrl?: string };
type CatalogMaterial = { id: string; code: string; name: string; unit: string };
type UsedMaterial = { lpuItemId: string; code: string; name: string; unit: string; quantity: number };
type AccessAttachment = { id?: string; name: string; storagePath: string; mime?: string; size?: number; url?: string };
type Access = { ticket: string; technician: string; expiresAt: string; title?: string; address?: string; scheduledAt?: string | null; contactName?: string | null; contactPhone?: string | null; materials?: Array<{ name: string; quantity: number | string; unit: string }> | null; attachments?: AccessAttachment[] | null; status?: string; accepted?: boolean; travel_started_at?: string | null; checked_in_at?: string | null; checked_out_at?: string | null; draft?: { execution_report?: string | null; evidence?: unknown; customer_signature_name?: string | null; customer_signature_data_url?: string | null } | null };
type ApiAccess = { token: string; code: string };
type ExecutionStep = "ASSIGNED" | "ACCEPTED" | "TRAVELING" | "CHECKED_IN" | "SUBMITTED" | "DONE";
type StepTimes = { travel?: string; arrival?: string; checkout?: string };

const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024;

async function compressEvidence(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  let maxDimension = 1600;
  let quality = 0.78;
  try {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Não foi possível preparar a imagem.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (!blob) throw new Error("Não foi possível preparar a imagem.");
      if (blob.size <= MAX_UPLOAD_BYTES || attempt === 3) {
        return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
      }
      maxDimension = Math.round(maxDimension * 0.82);
      quality = Math.max(0.58, quality - 0.06);
    }
  } finally {
    bitmap.close();
  }
  throw new Error("Não foi possível preparar a imagem.");
}

const journeySteps = [
  ["travel", "Deslocamento"],
  ["arrival", "Chegada e início"],
  ["photos", "3 fotos"],
  ["signature", "Assinatura"],
  ["checkout", "Checkout"],
] as const;

function stepFromOrderStatus(status?: string, accepted?: boolean): ExecutionStep {
  if (status === "TRAVELING") return "TRAVELING";
  if (status === "CHECKED_IN") return "CHECKED_IN";
  if (status === "IN_SERVICE") return "SUBMITTED";
  if (status === "COMPLETED" || status === "VALIDATED") return "DONE";
  return status === "DISPATCHED" && accepted ? "ACCEPTED" : "ASSIGNED";
}

export function PartnerExecutionFlow({ access, apiAccess, onLocalComplete }: { access: Access; apiAccess?: ApiAccess | null; onLocalComplete: () => void }) {
  const [step, setStep] = useState<ExecutionStep>(() => stepFromOrderStatus(access.status, access.accepted));
  const [report, setReport] = useState(() => access.draft?.execution_report ?? "");
  const [evidence, setEvidence] = useState<Evidence[]>(() => Array.isArray(access.draft?.evidence) ? access.draft.evidence.filter((item): item is Evidence => Boolean(item && typeof item === "object")) : []);
  const [name, setName] = useState(() => access.draft?.customer_signature_name ?? "");
  const [signature, setSignature] = useState(() => access.draft?.customer_signature_data_url ?? "");
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [signatureReady, setSignatureReady] = useState(false);
  const [materialCatalog, setMaterialCatalog] = useState<CatalogMaterial[]>([]);
  const [usedMaterials, setUsedMaterials] = useState<UsedMaterial[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [materialQuantity, setMaterialQuantity] = useState("1");
  const [materialsReady, setMaterialsReady] = useState(false);
  const [materialsError, setMaterialsError] = useState(false);
  const [materialsErrorCode, setMaterialsErrorCode] = useState<string | null>(null);
  const [materialReload, setMaterialReload] = useState(0);
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});
  const accessToken = apiAccess?.token;
  const accessCode = apiAccess?.code;
  const [stepTimes, setStepTimes] = useState<StepTimes>(() => ({ travel: access.travel_started_at ?? undefined, arrival: access.checked_in_at ?? undefined, checkout: access.checked_out_at ?? undefined }));
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);
  const [notice, setNotice] = useState(() => {
    const initial = stepFromOrderStatus(access.status, access.accepted);
    if (initial === "ACCEPTED") return "Visita aceita. Inicie o deslocamento quando sair para o atendimento.";
    if (initial === "TRAVELING") return "Deslocamento em andamento. Faça o check-in ao chegar.";
    if (initial === "CHECKED_IN") return "Check-in registrado. Preencha a execução do atendimento.";
    if (initial === "SUBMITTED") return "Atendimento registrado. Faça o checkout para enviar a OS ao gestor.";
    if (initial === "DONE") return "A OS já foi enviada para validação do gestor.";
    return "Confira os dados e aceite a visita para iniciar o atendimento.";
  });
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);

  useEffect(() => {
    if (!accessToken || !accessCode) return;
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    void fetch("/api/field-service/partner/materials", {
      method: "POST", headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({ token: accessToken, code: accessCode, action: "LIST" }),
    }).then(async (response) => {
      const payload = await response.json().catch(() => ({})) as { catalog?: CatalogMaterial[]; used?: UsedMaterial[]; code?: string };
      if (!response.ok) throw new Error(payload.code ?? "MATERIAL_SERVICE_UNAVAILABLE");
      return payload;
    }).then((payload) => {
      if (!active) return;
      setMaterialCatalog(Array.isArray(payload.catalog) ? payload.catalog : []);
      setUsedMaterials((Array.isArray(payload.used) ? payload.used : []).map((item) => ({ ...item, quantity: Number(item.quantity) })));
      setMaterialsReady(true);
    }).catch((error: unknown) => {
      if (active) {
        const code = error instanceof Error ? error.message : "MATERIAL_SERVICE_UNAVAILABLE";
        setMaterialsError(true);
        setMaterialsErrorCode(code);
        setNotice(code === "MATERIAL_SERVICE_NOT_DEPLOYED"
          ? "O catálogo de materiais ainda não está disponível neste ambiente. Avise o gestor para aplicar a atualização do banco."
          : "Não foi possível carregar os materiais. Tente novamente antes de salvar o atendimento.");
      }
    });
    return () => { active = false; controller.abort(); window.clearTimeout(timeout); };
  }, [accessToken, accessCode, materialReload]);

  useEffect(() => {
    if (!accessToken || !accessCode || !access.attachments?.length) return;
    let active = true;
    void Promise.all(access.attachments.map(async (attachment) => {
      const response = await fetch("/api/field-service/partner/attachment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: accessToken, code: accessCode, path: attachment.storagePath }) }).catch(() => null);
      const payload = await response?.json().catch(() => ({})) as { url?: string };
      return payload.url ? [attachment.storagePath, payload.url] as const : null;
    })).then((entries) => { if (active) setAttachmentUrls(Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => Boolean(entry)))); });
    return () => { active = false; };
  }, [accessToken, accessCode, access.attachments]);

  const submitEvent = async (event: "ACCEPT" | "TRAVEL_STARTED" | "CHECK_IN" | "SUBMIT" | "CHECK_OUT") => {
    if (!apiAccess) return true;
    if (busy) return false;
    if (!online) { setNotice("Sem conexão. Restabeleça a internet para registrar este evento."); return false; }
    setBusy(true);
    try {
      const evidenceMetadata = evidence.map((item) => ({ name: item.name, storagePath: item.storagePath, mime: item.mime, size: item.size }));
      const response = await fetch("/api/field-service/partner/event", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...apiAccess, event, report: event === "SUBMIT" ? report.trim() : undefined, evidence: event === "SUBMIT" ? evidenceMetadata : undefined, signatureName: name.trim() || undefined, signatureDataUrl: signature || undefined }),
      }).catch(() => null);
      if (!response) {
        if (event === "SUBMIT") {
          const recovery = await fetch("/api/field-service/partner/context", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(apiAccess) }).catch(() => null);
          const payload = await recovery?.json().catch(() => ({})) as { context?: { status?: string } } | undefined;
          if (recovery?.ok && payload?.context?.status === "IN_SERVICE") return true;
        }
        setNotice("Não foi possível conectar ao servidor. Confira sua conexão e tente novamente."); return false;
      }
      if (response.ok) return true;
      const payload = await response.json().catch(() => ({})) as { code?: string };
      setNotice(`Não foi possível registrar: ${payload.code ?? "erro de conexão"}.`);
      return false;
    } finally { setBusy(false); }
  };
  const move = (event: "TRAVEL_STARTED" | "CHECK_IN" | "CHECK_OUT", next: typeof step, message: string) => {
    void submitEvent(event).then((ok) => { if (ok) { const now = new Date().toISOString(); setStep(next); setStepTimes((current) => ({ ...current, ...(event === "TRAVEL_STARTED" ? { travel: now } : event === "CHECK_IN" ? { arrival: now } : { checkout: now }) })); setNotice(message); if (next === "DONE") onLocalComplete(); } });
  };
  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const selected = Array.from(files).filter((file) => file.type.startsWith("image/") && file.size <= 12 * 1024 * 1024).slice(0, 8 - evidence.length);
    if (!selected.length) { setNotice("Selecione uma imagem JPG, PNG ou WebP de até 12 MB antes da compressão."); return; }
    if (selected.length < files.length) setNotice("Alguns arquivos foram ignorados. São aceitas até 8 imagens de até 12 MB antes da compressão.");
    let compressed: File[];
    try { compressed = await Promise.all(selected.map(compressEvidence)); } catch { setNotice("Não foi possível preparar uma das imagens. Tente outra foto."); return; }
    if (!apiAccess) {
      const local = await Promise.all(compressed.map((file) => new Promise<Evidence>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve({ name: file.name, mime: "image/jpeg", size: file.size, dataUrl: typeof reader.result === "string" ? reader.result : "" }); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); })));
      setEvidence((current) => [...current, ...local.filter((item) => item.dataUrl)]);
      return;
    }
    for (const file of compressed) {
      const form = new FormData(); form.set("token", apiAccess.token); form.set("code", apiAccess.code); form.set("file", file);
      const response = await fetch("/api/field-service/partner/upload", { method: "POST", body: form }).catch(() => null);
      const payload = await response?.json().catch(() => ({})) as { evidence?: Evidence; code?: string } | undefined;
      if (!response?.ok || !payload?.evidence?.storagePath) { const message = payload?.code === "EVIDENCE_STORAGE_NOT_CONFIGURED" ? "O armazenamento de fotos ainda não está configurado no servidor. Avise o gestor." : payload?.code === "EVIDENCE_STORAGE_BUCKET_MISSING" ? "O armazenamento de fotos não está disponível. Avise o gestor." : payload?.code === "EVIDENCE_STORAGE_CREDENTIALS_INVALID" ? "A conexão segura do armazenamento precisa ser revisada pelo gestor." : payload?.code === "EVIDENCE_STORAGE_SIZE_REJECTED" ? "A foto ficou acima do limite. Tente uma imagem menor." : payload?.code === "EVIDENCE_STORAGE_UPLOAD_FAILED" ? "O servidor não conseguiu salvar a foto. Tente novamente." : `Não foi possível enviar a foto: ${payload?.code ?? "erro de conexão"}.`; setNotice(message); continue; }
      const preview = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : ""); reader.readAsDataURL(file); });
      setEvidence((current) => [...current, { ...(payload.evidence as Evidence), dataUrl: preview }]);
    }
  };
  const point = (pointer: PointerEvent<HTMLCanvasElement>) => { const item = canvas.current; if (!item) return [0, 0] as const; const rect = item.getBoundingClientRect(); return [(pointer.clientX - rect.left) * (item.width / rect.width), (pointer.clientY - rect.top) * (item.height / rect.height)] as const; };
  const drawStart = (pointer: PointerEvent<HTMLCanvasElement>) => { const item = canvas.current; const context = item?.getContext("2d"); if (!item || !context) return; const [x, y] = point(pointer); drawing.current = true; context.beginPath(); context.moveTo(x, y); item.setPointerCapture(pointer.pointerId); };
  const draw = (pointer: PointerEvent<HTMLCanvasElement>) => { if (!drawing.current) return; const context = canvas.current?.getContext("2d"); if (!context) return; const [x, y] = point(pointer); context.lineWidth = 3; context.lineCap = "round"; context.strokeStyle = "#092f40"; context.lineTo(x, y); context.stroke(); setSignatureReady(true); };
  const clear = () => { const item = canvas.current; const context = item?.getContext("2d"); if (item && context) context.clearRect(0, 0, item.width, item.height); setSignatureReady(false); setSignature(""); };
  const confirmSignature = () => { if (!name.trim()) return setNotice("Informe o nome do responsável pelo aceite."); if (!signatureReady || !canvas.current) return setNotice("Desenhe a assinatura antes de confirmar."); setSignature(canvas.current.toDataURL("image/png")); setSignatureOpen(false); setNotice("Assinatura confirmada e pronta para o RTO."); };
  const addUsedMaterial = () => {
    const item = materialCatalog.find((material) => material.id === selectedMaterialId);
    const quantity = Number(materialQuantity.replace(",", "."));
    if (!item || !Number.isFinite(quantity) || quantity <= 0 || quantity > 100000 || Math.abs(quantity * 1000 - Math.round(quantity * 1000)) > 0.000001) {
      setNotice("Selecione um material e informe uma quantidade válida com até 3 casas decimais.");
      return;
    }
    if ((usedMaterials.find((material) => material.lpuItemId === item.id)?.quantity ?? 0) + quantity > 100000) {
      setNotice("A quantidade total desse material excede o limite permitido.");
      return;
    }
    setUsedMaterials((current) => {
      const existing = current.find((material) => material.lpuItemId === item.id);
      return existing
        ? current.map((material) => material.lpuItemId === item.id ? { ...material, quantity: Number((material.quantity + quantity).toFixed(3)) } : material)
        : [...current, { lpuItemId: item.id, code: item.code, name: item.name, unit: item.unit, quantity }];
    });
    setSelectedMaterialId("");
    setMaterialQuantity("1");
  };
  const save = async () => {
    if (report.trim().length < 10) return setNotice("Descreva o atendimento com pelo menos 10 caracteres antes de salvar.");
    if (evidence.length < 3) return setNotice(`Adicione 3 fotos de evidência antes de salvar. Faltam ${3 - evidence.length}.`);
    if (!name.trim() || !signature) return setNotice("Colete e confirme a assinatura do responsável.");
    if (apiAccess) {
      // Materiais são opcionais. Uma indisponibilidade temporária do catálogo
      // não pode impedir o técnico de registrar o atendimento e liberar o checkout.
      if (!materialsReady && !materialsError) return setNotice("Aguarde o carregamento dos materiais ou tente novamente.");
      if (materialsError) setNotice("Catálogo indisponível. O atendimento será salvo sem materiais; o gestor poderá complementar depois.");
      setBusy(true);
      try {
        if (materialsReady) {
          const response = await fetch("/api/field-service/partner/materials", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...apiAccess, action: "SAVE", items: usedMaterials.map((item) => ({ lpuItemId: item.lpuItemId, quantity: item.quantity })) }),
          }).catch(() => null);
          if (!response?.ok) {
            const payload = await response?.json().catch(() => ({})) as { code?: string } | undefined;
            setNotice(payload?.code === "MATERIAL_SERVICE_NOT_DEPLOYED"
              ? "Catálogo indisponível. O atendimento será salvo sem materiais; o gestor poderá complementar depois."
              : `Não foi possível salvar os materiais: ${payload?.code ?? "erro de conexão"}.`);
            return;
          }
        }
      } finally { setBusy(false); }
    }
    const ok = await submitEvent("SUBMIT");
    if (ok) { setStep("SUBMITTED"); setNotice("Atendimento registrado. Faça o checkout para enviar a OS ao gestor."); }
  };
  const stage = step === "ASSIGNED" ? "Etapa 1 de 5 · aceitar visita" : step === "ACCEPTED" ? "Etapa 2 de 5 · iniciar deslocamento" : step === "TRAVELING" ? "Etapa 3 de 5 · confirmar chegada" : step === "CHECKED_IN" ? "Etapa 4 de 5 · registrar execução" : step === "SUBMITTED" ? "Etapa 5 de 5 · fazer checkout" : "OS enviada para validação do gestor";
  const completed = (key: typeof journeySteps[number][0]) => key === "travel" ? ["TRAVELING", "CHECKED_IN", "SUBMITTED", "DONE"].includes(step) : key === "arrival" ? ["CHECKED_IN", "SUBMITTED", "DONE"].includes(step) : key === "photos" ? evidence.length >= 3 : key === "signature" ? Boolean(signature) : step === "DONE";
  const timeline = <section aria-label="Jornada do atendimento" className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-slate-500">Jornada do atendimento</p><ol className="mt-3 grid grid-cols-5 gap-1">{journeySteps.map(([key, label], index) => { const done = completed(key); const time = key === "travel" ? stepTimes.travel : key === "arrival" ? stepTimes.arrival : key === "checkout" ? stepTimes.checkout : undefined; return <li key={key} className="relative text-center"><div className={`mx-auto grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${done ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"}`} aria-label={done ? `${label} concluído` : `${label} pendente`}>{done ? "✓" : index + 1}</div><p className={`mt-1 text-[10px] font-semibold leading-tight ${done ? "text-emerald-800" : "text-slate-500"}`}>{label}</p>{time ? <p className="mt-0.5 text-[9px] text-slate-500">{new Date(time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p> : null}</li>; })}</ol></section>;

  const contactLabel = [access.contactName, access.contactPhone].filter(Boolean).join(" · ") || "Não informado";
  const materialsLabel = access.materials?.length ? access.materials.map((item) => `${item.name} · ${item.quantity} ${item.unit}`).join(", ") : "Não informado";
  const evidenceGallery = evidence.length > 0 ? <div className="mt-4" aria-label="Fotos anexadas"><p className="mb-2 text-xs font-semibold text-slate-600">Fotos anexadas ({evidence.length})</p><div className="grid grid-cols-3 gap-2">{evidence.map((item, index) => <div key={`${item.storagePath ?? item.name}-${index}`} className="aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100">{item.dataUrl ? <img src={item.dataUrl} alt={`Evidência ${index + 1}`} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center p-2 text-center text-[10px] text-slate-500">Foto enviada</div>}</div>)}</div></div> : null;
  const requesterGallery = access.attachments?.length ? <div className="mt-5 border-t border-slate-200 pt-4"><h3 className="text-sm font-bold text-slate-800">Fotos enviadas pelo solicitante</h3><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{access.attachments.map((attachment) => attachmentUrls[attachment.storagePath] ? <a key={attachment.storagePath} href={attachmentUrls[attachment.storagePath]} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50"><img src={attachmentUrls[attachment.storagePath]} alt={attachment.name} className="h-28 w-full object-cover" /><span className="block truncate px-2 py-1 text-xs text-slate-600">{attachment.name}</span></a> : <div key={attachment.storagePath} className="h-28 animate-pulse rounded-lg bg-slate-100" />)}</div></div> : null;
  const visitSummary = <section aria-labelledby="ticket-details-title" className="rounded-xl border border-slate-200 bg-white p-4"><div className="rounded-lg bg-[#092f40] px-3 py-2.5"><h2 id="ticket-details-title" className="text-sm font-bold uppercase tracking-wide text-white">Detalhes do chamado</h2></div><dl className="mt-4 grid gap-3 text-sm"><div><dt className="font-bold text-slate-800">Descrição do serviço</dt><dd className="mt-1 text-slate-700">{access.title ?? "Não informado"}</dd></div><div><dt className="font-bold text-slate-800">Local</dt><dd className="mt-1 text-slate-700">{access.address ?? "Não informado"}</dd></div><div className="grid grid-cols-2 gap-3"><div><dt className="font-bold text-slate-800">Data e horário agendados</dt><dd className="mt-1 text-slate-700">{access.scheduledAt ? new Date(access.scheduledAt).toLocaleString("pt-BR") : "A combinar"}</dd></div><div><dt className="font-bold text-slate-800">Contato no local</dt><dd className="mt-1 text-slate-700">{contactLabel}</dd></div></div><div><dt className="font-bold text-slate-800">Materiais estimados</dt><dd className="mt-1 text-slate-700">{materialsLabel}</dd></div></dl>{requesterGallery}{access.address && <a href={`https://waze.com/ul?q=${encodeURIComponent(access.address)}`} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm font-semibold text-cyan-800 underline">Abrir rota no Waze ↗</a>}{evidenceGallery}</section>;
  const shell = (content: ReactNode) => <main className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-100 p-4 sm:p-8"><section className="mx-auto w-full min-w-0 max-w-xl overflow-hidden break-words rounded-2xl border bg-white shadow-xl shadow-slate-900/10"><header className="bg-[#092f40] px-5 py-5 text-white"><div className="flex items-center justify-between gap-4"><Image src="/oneit-logo-field.png" alt="OneIT" width={132} height={40} className="h-10 w-auto object-contain" priority /><Image src="/servicia-logo.png" alt="Servicia Facilities Services" width={220} height={64} className="h-10 w-auto max-w-[52%] object-contain object-right" priority /></div><p className="mt-3 text-xs font-semibold tracking-[.16em] text-cyan-200">ATENDIMENTO DE CAMPO</p><h1 className="mt-1 text-lg font-semibold">{access.ticket}</h1><p className="mt-1 text-sm text-cyan-100">{stage}</p><p className={`mt-2 text-xs ${online ? "text-emerald-200" : "text-amber-200"}`} role="status">{online ? "● Conectado" : "● Sem conexão"}</p></header><div className="space-y-5 p-6">{timeline}<section aria-label="Próxima ação" className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-orange-700">Próxima ação</p><p className="mt-1 text-sm font-semibold text-slate-900">{stage}</p></section>{visitSummary}{content}<p aria-live="polite" className="rounded-lg bg-cyan-50 p-3 text-sm text-cyan-900">{notice}</p></div></section></main>;
  const isAssigned = () => step === "ASSIGNED";
  const isAccepted = () => step === "ACCEPTED";
  if (isAssigned()) return shell(<><p className="text-sm text-slate-600">Confirme que você assumirá esta visita. O deslocamento só será iniciado quando você sair para o local.</p><button type="button" disabled={busy} onClick={() => { void submitEvent("ACCEPT").then((ok) => { if (ok) { setStep("ACCEPTED"); setNotice("Visita aceita. Inicie o deslocamento quando sair para o atendimento."); } }); }} className="w-full rounded-xl bg-[#092f40] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Registrando…" : "Aceitar visita"}</button></>);
  if (isAccepted()) return shell(<><p className="text-sm text-slate-600">A visita foi aceita. Registre o deslocamento somente ao sair para o local.</p><button type="button" disabled={busy} onClick={() => move("TRAVEL_STARTED", "TRAVELING", "Deslocamento registrado. Faça o check-in ao chegar ao local.")} className="w-full rounded-xl bg-[#092f40] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Registrando…" : "Iniciar deslocamento"}</button></>);

  return shell(<>
    {step === "ASSIGNED" && <button type="button" disabled={busy} onClick={() => move("TRAVEL_STARTED", "TRAVELING", "Deslocamento registrado. Faça o check-in ao chegar ao local.")} className="w-full rounded-xl bg-[#092f40] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Registrando…" : "Iniciar deslocamento"}</button>}
    {step === "TRAVELING" && <button type="button" disabled={busy} onClick={() => move("CHECK_IN", "CHECKED_IN", "Check-in registrado. Preencha a execução do atendimento.")} className="w-full rounded-xl bg-[#092f40] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Registrando…" : "Cheguei ao local · fazer check-in"}</button>}
    {step === "CHECKED_IN" && <>
      <fieldset className="rounded-xl border border-slate-200 p-3"><legend className="px-1 text-sm font-semibold">Fotos da execução</legend><div className="grid grid-cols-2 gap-2"><label className="cursor-pointer rounded-lg border border-dashed border-slate-300 p-3 text-center text-sm font-semibold text-slate-700">Adicionar da galeria<input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(input) => { void addPhotos(input.target.files); input.target.value = ""; }} /></label><label className="cursor-pointer rounded-lg bg-[#092f40] p-3 text-center text-sm font-semibold text-white">Abrir câmera<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={(input) => { void addPhotos(input.target.files); input.target.value = ""; }} /></label></div><p className="mt-2 text-xs text-slate-500">Obrigatório: 3 fotos · até 8 imagens JPG, PNG ou WebP de 12 MB antes da compressão.</p>{evidence.length > 0 && <p className="text-xs text-emerald-700">{evidence.length} foto(s) anexada(s).</p>}</fieldset>
      <label className="block text-sm font-semibold">Relatório do atendimento<textarea value={report} onChange={(input) => setReport(input.target.value)} className="mt-2 min-h-32 w-full rounded-xl border p-3 font-normal" placeholder="Diagnóstico, atividades e resultado..." /></label>
      <section aria-labelledby="used-materials-title" className="rounded-xl border border-slate-200 p-4">
        <h2 id="used-materials-title" className="text-sm font-semibold text-slate-950">Materiais utilizados</h2>
        <p className="mt-1 text-xs text-slate-600">Informe as quantidades realmente usadas. O gestor fará a conferência e a precificação pela LPU.</p>
        {!apiAccess ? <p className="mt-3 text-xs text-slate-600">O lançamento de materiais está disponível no atendimento seguro da OS.</p> : materialsReady ? <>
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_96px] gap-2">
            <label className="text-xs font-medium text-slate-700">Material
              <select value={selectedMaterialId} onChange={(input) => setSelectedMaterialId(input.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm">
                <option value="">Selecione</option>
                {materialCatalog.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-700">Quantidade
              <input value={materialQuantity} onChange={(input) => setMaterialQuantity(input.target.value)} type="number" min="0.001" max="100000" step="0.001" inputMode="decimal" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
            </label>
          </div>
          <button type="button" onClick={addUsedMaterial} disabled={!selectedMaterialId || usedMaterials.length >= 30} className="mt-2 rounded-lg border border-cyan-800 px-3 py-2 text-sm font-semibold text-cyan-900 disabled:opacity-50">Adicionar material</button>
          {usedMaterials.length ? <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
            {usedMaterials.map((item) => <li key={item.lpuItemId} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span>{item.name} · <strong>{item.quantity} {item.unit}</strong></span>
              <button type="button" onClick={() => setUsedMaterials((current) => current.filter((material) => material.lpuItemId !== item.lpuItemId))} aria-label={`Remover ${item.name}`} className="text-xs font-semibold text-red-700">Remover</button>
            </li>)}
          </ul> : <p className="mt-3 text-xs text-slate-500">Nenhum material utilizado.</p>}
          {!materialCatalog.length && <p className="mt-2 text-xs text-amber-800">Não há materiais vigentes na LPU desta organização. Solicite o cadastro ao gestor.</p>}
        </> : materialsError ? <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-900">Não foi possível carregar os materiais. O lançamento é opcional; você pode salvar o atendimento sem materiais e o gestor poderá complementar depois.</p>
          {materialsErrorCode ? <p className="mt-1 text-[11px] font-mono text-amber-800">Código: {materialsErrorCode}</p> : null}
          <button type="button" onClick={() => { setMaterialsReady(false); setMaterialsError(false); setMaterialsErrorCode(null); setMaterialReload((value) => value + 1); }} className="mt-2 text-xs font-semibold text-cyan-900 underline">Tentar novamente</button>
        </div> : <p className="mt-3 text-xs text-slate-500">Carregando materiais cadastrados…</p>}
      </section>
      <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4"><p className="text-sm font-semibold text-cyan-950">Aceite do cliente</p><input value={name} onChange={(input) => { setName(input.target.value); setSignature(""); }} className="mt-3 w-full rounded-lg border bg-white px-3 py-2 text-sm" placeholder="Nome do responsável" /><button type="button" onClick={() => setSignatureOpen(true)} className="mt-2 w-full rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white">{signature ? "Assinatura confirmada ✓" : "Abrir assinatura"}</button></div>
      <button type="button" disabled={busy} onClick={() => { void save(); }} className="w-full rounded-xl bg-[#092f40] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Salvando atendimento…" : "Salvar atendimento e liberar checkout"}</button>
    </>}
    {step === "SUBMITTED" && <button type="button" disabled={busy} onClick={() => move("CHECK_OUT", "DONE", "Checkout realizado. A OS foi enviada para validação do gestor.")} className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Enviando…" : "Fazer checkout e enviar OS"}</button>}
    {signatureOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"><div role="dialog" aria-modal="true" aria-labelledby="signature-title" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"><h2 id="signature-title" className="text-lg font-semibold">Assinatura do responsável</h2><p className="mt-1 text-sm text-slate-600">Use o dedo no quadro abaixo.</p><canvas aria-label="Área para desenhar a assinatura" ref={canvas} width={720} height={320} onPointerDown={drawStart} onPointerMove={draw} onPointerUp={() => { drawing.current = false; }} onPointerCancel={() => { drawing.current = false; }} className="mt-4 h-48 w-full touch-none rounded-xl border-2 border-dashed border-slate-300 bg-white" /><div className="mt-4 flex justify-between gap-2"><button type="button" onClick={() => { setSignatureOpen(false); setSignatureReady(false); setSignature(""); }} className="rounded-lg border px-4 py-2 text-sm font-semibold">Cancelar</button><button type="button" onClick={clear} className="rounded-lg border px-4 py-2 text-sm font-semibold">Limpar</button><button type="button" onClick={confirmSignature} className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white">Confirmar assinatura</button></div></div></div>}
  </>);
}
