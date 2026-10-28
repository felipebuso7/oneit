"use client";

import { useEffect, useState } from "react";
import { PartnerExecutionFlow } from "@/components/field-service/partner-execution-flow";

type PartnerAccess = { ticket: string; code: string; expiresAt: string; technician: string; createdAt: string; used: boolean; token?: string; orderId?: string; title?: string; address?: string; status?: string; accepted?: boolean; travel_started_at?: string | null; checked_in_at?: string | null; checked_out_at?: string | null };

export default function PartnerAccessDemo() {
  const [ticket, setTicket] = useState("");
  const [code, setCode] = useState("");
  const [accesses, setAccesses] = useState<PartnerAccess[]>([]);
  const [activeAccess, setActiveAccess] = useState<PartnerAccess | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [notice, setNotice] = useState("Informe o chamado e o código temporário recebido.");
  const [apiAccess, setApiAccess] = useState<{ token: string; code: string } | null>(null);
  // A inicialização sincroniza o estado local e o acesso remoto do link.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { try { const stored = JSON.parse(localStorage.getItem("oneit.demo.field-partner-access.v1") ?? "[]"); if (Array.isArray(stored)) setAccesses(stored); } catch { setNotice("Não foi possível carregar os acessos temporários."); } let token = ""; let linkCode = ""; try { const handoff = JSON.parse(sessionStorage.getItem("oneit.partner.access.v1") ?? "null") as { token?: string; code?: string } | null; token = handoff?.token ?? ""; linkCode = handoff?.code ?? ""; if (token && linkCode) sessionStorage.removeItem("oneit.partner.access.v1"); } catch { /* armazenamento indisponível; o formulário local continua utilizável */ } if (token && linkCode) { setApiAccess({ token, code: linkCode }); setCode(linkCode); setNotice("Validando o acesso seguro da OS…"); void fetch("/api/field-service/partner/context", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, code: linkCode }) }).then(async (response) => { const payload = await response.json().catch(() => ({})) as { context?: { service_order_id?: string; order_number?: string; ticket_number?: string; title?: string; access_expires_at?: string; partner_accepted?: boolean; location_address?: string; status?: string; travel_started_at?: string | null; checked_in_at?: string | null; checked_out_at?: string | null }; code?: string }; if (!response.ok || !payload.context?.access_expires_at) { setNotice(payload.code === "ACCESS_EXPIRED" ? "Este link expirou. Solicite um novo acesso ao gestor." : "Não foi possível validar este link."); return; } const context = payload.context; const remote: PartnerAccess = { ticket: context.ticket_number ?? context.order_number ?? "OS", code: linkCode, token, orderId: context.service_order_id, technician: "Técnico autorizado", title: context.title, address: context.location_address, status: context.status, accepted: context.partner_accepted, travel_started_at: context.travel_started_at, checked_in_at: context.checked_in_at, checked_out_at: context.checked_out_at, expiresAt: context.access_expires_at ?? "", createdAt: new Date().toISOString(), used: false }; setActiveAccess(remote); setTicket(remote.ticket); setAuthorized(true); setNotice("Acesso seguro validado. Registre o atendimento desta OS."); }).catch(() => setNotice("Não foi possível conectar ao servidor. Tente novamente.")); } }, []);
  const validate = async () => {
    if (apiAccess) return;
    const found = accesses.find((item) => item.ticket.toUpperCase() === ticket.trim().toUpperCase() && item.code === code.trim() && new Date(item.expiresAt).getTime() > Date.now() && !item.used);
    if (found) { setActiveAccess(found); setAuthorized(true); setNotice("Acesso temporário validado para um único atendimento."); }
    else setNotice("Acesso inválido, expirado ou já utilizado. Solicite um novo código ao gestor.");
  };

  if (!authorized) return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-5"><section className="w-full max-w-md rounded-2xl border bg-white p-7 shadow-xl shadow-slate-900/10"><p className="text-xs font-semibold tracking-[.16em] text-orange-500">ONEIT · ACESSO EXTERNO</p><h1 className="mt-2 text-2xl font-semibold">Atendimento de parceiro</h1><p className="mt-3 text-sm leading-6 text-slate-600">Este acesso é temporário, limitado a um chamado e auditável. Não fornece acesso à plataforma interna.</p><div className="mt-6 space-y-4"><label className="block text-sm font-semibold">Número do chamado<input value={ticket} onChange={(event) => setTicket(event.target.value)} placeholder="Ex.: REQ-0291" className="mt-1 w-full rounded-lg border px-3 py-3 font-normal" /></label><label className="block text-sm font-semibold">Código temporário<input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" placeholder="6 dígitos" className="mt-1 w-full rounded-lg border px-3 py-3 font-normal" /></label></div><p aria-live="polite" className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{notice}</p><button type="button" onClick={validate} className="mt-5 w-full rounded-xl bg-[#092f40] px-4 py-3 text-sm font-semibold text-white">Validar acesso</button><p className="mt-4 text-center text-xs text-slate-400">O gestor gera o código na ordem de serviço atribuída ao parceiro.</p></section></main>;

  if (activeAccess) return <PartnerExecutionFlow access={activeAccess} apiAccess={apiAccess} onLocalComplete={() => {
    if (apiAccess) return;
    const updated = accesses.map((item) => item.ticket === activeAccess.ticket ? { ...item, used: true } : item);
    localStorage.setItem("oneit.demo.field-partner-access.v1", JSON.stringify(updated));
  }} />;
  return null;
}
