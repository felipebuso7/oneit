"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export function PartnerCodeGate() {
  return <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-slate-100 p-5"><p role="status" className="text-sm text-slate-600">Carregando acesso do técnico…</p></main>}><PartnerCodeGateForm /></Suspense>;
}

function PartnerCodeGateForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? (typeof window !== "undefined" ? new URLSearchParams(window.location.hash.slice(1)).get("token") : null) ?? "";
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState("Informe o código temporário enviado pelo gestor.");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) { setNotice("Link de acesso inválido. Solicite um novo envio ao gestor."); return; }
    if (!/^\d{6}$/.test(code)) { setNotice("Informe o código de seis dígitos enviado pelo gestor."); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/field-service/partner/context", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, code }) });
      const payload = await response.json().catch(() => ({})) as { code?: string };
      if (!response.ok) {
        setNotice(payload.code === "ACCESS_EXPIRED" ? "Este link expirou. Solicite um novo acesso ao gestor." : payload.code === "ACCESS_LOCKED" ? "Acesso bloqueado após tentativas inválidas. Solicite um novo link." : "Código inválido. Confira e tente novamente.");
        return;
      }
      sessionStorage.setItem("oneit.partner.access.v1", JSON.stringify({ token, code }));
      router.replace("/field-service/partner");
    } catch { setNotice("Não foi possível validar o código. Verifique sua conexão e tente novamente."); }
    finally { setLoading(false); }
  }

  return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-5"><section className="w-full max-w-md rounded-2xl border bg-white p-7 shadow-xl shadow-slate-900/10"><p className="text-xs font-semibold tracking-[.16em] text-orange-500">ONEIT · ACESSO DE CAMPO</p><h1 className="mt-2 text-2xl font-semibold">Confirmar atendimento</h1><p className="mt-3 text-sm leading-6 text-slate-600">Digite o código temporário recebido separadamente no WhatsApp. Ele confirma que você é o técnico designado para esta OS.</p><form onSubmit={(event) => void submit(event)} className="mt-6"><label className="block text-sm font-semibold">Código temporário<input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" className="mt-1 w-full rounded-lg border px-3 py-3 font-normal tracking-[.35em]" autoFocus /></label><p aria-live="polite" className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{notice}</p><button disabled={loading} className="mt-5 w-full rounded-xl bg-[#092f40] px-4 py-3 text-sm font-semibold text-white disabled:bg-slate-300">{loading ? "Validando…" : "Abrir atendimento"}</button></form><p className="mt-4 text-center text-xs text-slate-400">O código expira junto com o link e é limitado por tentativas.</p></section></main>;
}
