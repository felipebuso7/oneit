"use client";

import { PointerEvent, useRef, useState } from "react";

type EvidenceFile = {
  name: string;
  dataUrl?: string;
  storagePath?: string;
  mime?: "image/jpeg" | "image/png" | "image/webp";
  size?: number;
};

type Access = {
  ticket: string;
  technician: string;
  expiresAt: string;
  title?: string;
  address?: string;
};

type Props = {
  access: Access;
  apiAccess?: { token: string; code: string } | null;
  onLocalComplete: () => void;
};

export function PartnerExecution({ access, apiAccess, onLocalComplete }: Props) {
  const [checkedIn, setCheckedIn] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [checkedOut, setCheckedOut] = useState(false);
  const [report, setReport] = useState("");
  const [evidence, setEvidence] = useState<EvidenceFile[]>([]);
  const [signatureName, setSignatureName] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState("");
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [signatureReady, setSignatureReady] = useState(false);
  const [notice, setNotice] = useState("Faça o check-in ao chegar no local.");
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  const event = async (eventName: "CHECK_IN" | "SUBMIT" | "CHECK_OUT") => {
    if (!apiAccess) return true;
    const response = await fetch("/api/field-service/partner/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...apiAccess,
        event: eventName,
        report: eventName === "SUBMIT" ? report.trim() : null,
        evidence,
        signatureName: signatureName.trim() || undefined,
        signatureDataUrl: signatureDataUrl || undefined,
      }),
    });
    if (response.ok) return true;
    const payload = await response.json().catch(() => ({})) as { code?: string };
    setNotice(`Não foi possível registrar: ${payload.code ?? "erro de conexão"}.`);
    return false;
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    if (!apiAccess) {
      const selected = Array.from(files).slice(0, 8 - evidence.length);
      const items = await Promise.all(selected.map((file) => new Promise<EvidenceFile>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ name: file.name, dataUrl: typeof reader.result === "string" ? reader.result : "" });
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      })));
      setEvidence((current) => [...current, ...items.filter((item) => item.dataUrl)]);
      return;
    }
    for (const file of Array.from(files).slice(0, 8 - evidence.length)) {
      const form = new FormData();
      form.set("token", apiAccess.token);
      form.set("code", apiAccess.code);
      form.set("file", file);
      try {
        const response = await fetch("/api/field-service/partner/upload", { method: "POST", body: form });
        const payload = await response.json().catch(() => ({})) as { evidence?: EvidenceFile; code?: string };
        if (!response.ok || !payload.evidence?.storagePath) {
          setNotice(`Não foi possível enviar a foto: ${payload.code ?? "arquivo inválido"}.`);
          continue;
        }
        setEvidence((current) => [...current, payload.evidence as EvidenceFile]);
      } catch {
        setNotice("Não foi possível enviar a foto. Verifique a conexão.");
      }
    }
  };

  const canvasPoint = (pointer: PointerEvent<HTMLCanvasElement>) => {
    const element = canvas.current;
    if (!element) return [0, 0] as const;
    const rect = element.getBoundingClientRect();
    return [(pointer.clientX - rect.left) * (element.width / rect.width), (pointer.clientY - rect.top) * (element.height / rect.height)] as const;
  };
  const begin = (pointer: PointerEvent<HTMLCanvasElement>) => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context) return;
    const [x, y] = canvasPoint(pointer);
    drawing.current = true;
    context.beginPath();
    context.moveTo(x, y);
    element.setPointerCapture(pointer.pointerId);
  };
  const draw = (pointer: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    const [x, y] = canvasPoint(pointer);
    context.lineWidth = 3;
    context.lineCap = "round";
    context.strokeStyle = "#092f40";
    context.lineTo(x, y);
    context.stroke();
    setSignatureReady(true);
  };
  const clearSignature = () => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (element && context) context.clearRect(0, 0, element.width, element.height);
    setSignatureReady(false);
    setSignatureDataUrl("");
  };
  const confirmSignature = () => {
    if (!signatureName.trim()) return setNotice("Informe o nome do responsável pelo aceite.");
    if (!signatureReady || !canvas.current) return setNotice("Desenhe a assinatura antes de confirmar.");
    setSignatureDataUrl(canvas.current.toDataURL("image/png"));
    setSignatureOpen(false);
    setNotice("Assinatura confirmada e pronta para o RTO.");
  };
  const saveReport = () => {
    if (!report.trim()) return setNotice("Descreva o atendimento antes de salvar.");
    if (!signatureName.trim() || !signatureDataUrl) return setNotice("Colete e confirme a assinatura do responsável.");
    if (!evidence.length) return setNotice("Adicione ao menos uma foto de evidência.");
    void event("SUBMIT").then((ok) => {
      if (!ok) return;
      setSubmitted(true);
      setNotice("Relatório, aceite e evidências registrados. Faça o checkout para enviar a OS ao gestor.");
    });
  };
  const close = () => {
    void event("CHECK_OUT").then((ok) => {
      if (!ok) return;
      setCheckedOut(true);
      onLocalComplete();
      setNotice("Checkout realizado. A OS foi enviada para validação do gestor.");
    });
  };

  return <main className="min-h-screen bg-slate-100 p-4 sm:p-8"><section className="mx-auto max-w-xl overflow-hidden rounded-2xl border bg-white shadow-xl shadow-slate-900/10"><header className="bg-[#092f40] px-6 py-5 text-white"><p className="text-xs font-semibold tracking-[.16em] text-cyan-200">ACESSO EXTERNO TEMPORÁRIO</p><h1 className="mt-1 text-lg font-semibold">{access.ticket} · Atendimento de campo</h1></header><div className="space-y-5 p-6"><div className="rounded-xl bg-slate-50 p-4"><p className="font-semibold">Atendimento liberado pelo gestor</p>{access.title && <p className="mt-2 text-sm text-slate-600">{access.title}</p>}<p className="mt-2 text-sm text-slate-600">Técnico autorizado: {access.technician}</p>{access.address && <p className="mt-2 text-sm text-slate-600">Local: {access.address}</p>}<p className="mt-2 text-sm text-slate-600">Validade: {new Date(access.expiresAt).toLocaleString("pt-BR")}</p></div><div className="grid grid-cols-2 gap-3"><button type="button" disabled={checkedIn || checkedOut} onClick={() => { void event("CHECK_IN").then((ok) => { if (ok) { setCheckedIn(true); setNotice("Check-in registrado com data e hora."); } }); }} className="rounded-xl bg-[#092f40] px-3 py-3 text-sm font-semibold text-white disabled:bg-slate-200">{checkedIn ? "Check-in realizado" : "Fazer check-in"}</button><label className="cursor-pointer rounded-xl border border-slate-300 px-3 py-3 text-center text-sm font-semibold text-slate-700">Adicionar fotos<input type="file" accept="image/*" multiple disabled={!checkedIn || checkedOut || evidence.length >= 8} className="hidden" onChange={(input) => { void addPhotos(input.target.files); input.target.value = ""; }} /></label></div>{evidence.length > 0 && <p className="text-xs text-emerald-700">{evidence.length} foto(s) pronta(s) para o RTO.</p>}<div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4"><p className="text-sm font-semibold text-cyan-950">Aceite do cliente</p><p className="mt-1 text-xs text-cyan-900">O nome e o desenho da assinatura serão inseridos no RTO.</p><input value={signatureName} onChange={(input) => { setSignatureName(input.target.value); setSignatureDataUrl(""); }} disabled={!checkedIn || submitted || checkedOut} placeholder="Nome do responsável pelo aceite" className="mt-3 w-full rounded-lg border bg-white px-3 py-2 text-sm disabled:bg-slate-100" /><button type="button" disabled={!checkedIn || submitted || checkedOut} onClick={() => setSignatureOpen(true)} className="mt-2 w-full rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300">{signatureDataUrl ? "Assinatura confirmada ✓" : "Abrir assinatura"}</button></div><label className="block text-sm font-semibold">Relatório do atendimento<textarea value={report} onChange={(input) => setReport(input.target.value)} disabled={!checkedIn || submitted || checkedOut} placeholder="Descreva o diagnóstico, as atividades e o resultado..." className="mt-2 min-h-36 w-full rounded-xl border p-3 font-normal disabled:bg-slate-50" /></label><p aria-live="polite" className="rounded-lg bg-cyan-50 p-3 text-sm text-cyan-900">{notice}</p><div className="grid gap-3 sm:grid-cols-2"><button type="button" disabled={!checkedIn || submitted || checkedOut} onClick={saveReport} className="rounded-xl border border-[#092f40] px-4 py-3 text-sm font-semibold text-[#092f40] disabled:bg-slate-100">{submitted ? "Relatório registrado" : "Salvar relatório"}</button><button type="button" disabled={!submitted || checkedOut} onClick={close} className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white disabled:bg-slate-200">{checkedOut ? "Checkout realizado" : "Finalizar e enviar OS"}</button></div><p className="text-center text-xs text-slate-400">Ações, evidências e aceite serão mantidos no histórico da OS.</p></div></section>{signatureOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Aceite do cliente</p><h2 className="mt-1 text-lg font-semibold">Assine na tela</h2></div><button type="button" onClick={() => setSignatureOpen(false)} className="text-xl text-slate-500" aria-label="Fechar">×</button></div><p className="mt-2 text-sm text-slate-600">Use o dedo para assinar no quadro abaixo.</p><canvas ref={canvas} width={720} height={320} onPointerDown={begin} onPointerMove={draw} onPointerUp={() => { drawing.current = false; }} onPointerCancel={() => { drawing.current = false; }} className="mt-4 h-48 w-full touch-none rounded-xl border-2 border-dashed border-slate-300 bg-white" /><div className="mt-4 flex justify-between gap-2"><button type="button" onClick={clearSignature} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Limpar</button><button type="button" onClick={confirmSignature} className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white">✓ Confirmar assinatura</button></div></div></div>}</main>;
}
