"use client";

import { useEffect, useState } from "react";

import { PartnerExecutionFlow } from "@/components/field-service/partner-execution-flow";

type SecureAccess = {
  ticket: string;
  code: string;
  token: string;
  orderId?: string;
  title?: string;
  address?: string;
  technician: string;
  expiresAt: string;
  status?: string;
  accepted?: boolean;
  travel_started_at?: string | null;
  checked_in_at?: string | null;
  checked_out_at?: string | null;
  draft?: { execution_report?: string | null; evidence?: unknown; customer_signature_name?: string | null; customer_signature_data_url?: string | null } | null;
};

export function SecurePartnerPage() {
  const [access, setAccess] = useState<SecureAccess | null>(null);
  const [notice, setNotice] = useState("Validando o acesso seguro da OS…");

  useEffect(() => {
    let handoff: { token?: string; code?: string } | null = null;
    try {
      handoff = JSON.parse(sessionStorage.getItem("oneit.partner.access.v1") ?? "null") as { token?: string; code?: string } | null;
      sessionStorage.removeItem("oneit.partner.access.v1");
    } catch {
      // O estado comunica uma falha de leitura do handoff externo ao usuário.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotice("O navegador não permitiu recuperar o acesso temporário. Solicite um novo link ao gestor.");
      return;
    }
    if (!handoff?.token || !handoff.code) {
      setNotice("Abra o link completo enviado pelo gestor e informe o código temporário na etapa anterior.");
      return;
    }
    void fetch("/api/field-service/partner/context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(handoff),
    }).then(async (response) => {
      const payload = await response.json().catch(() => ({})) as { context?: { ticket_number?: string; order_number?: string; service_order_id?: string; title?: string; access_expires_at?: string; location_address?: string; status?: string; partner_accepted?: boolean; travel_started_at?: string | null; checked_in_at?: string | null; checked_out_at?: string | null; draft?: SecureAccess["draft"] }; code?: string };
      if (!response.ok || !payload.context?.access_expires_at) {
        setNotice(payload.code === "ACCESS_EXPIRED" ? "Este link expirou. Solicite um novo acesso ao gestor." : "Não foi possível validar este acesso. Solicite um novo link.");
        return;
      }
      const context = payload.context;
      const expiresAt = context.access_expires_at as string;
      setAccess({ ticket: context.ticket_number ?? context.order_number ?? "OS", code: handoff.code as string, token: handoff.token as string, orderId: context.service_order_id, title: context.title, address: context.location_address, technician: "Técnico autorizado", expiresAt, status: context.status, accepted: context.partner_accepted, travel_started_at: context.travel_started_at, checked_in_at: context.checked_in_at, checked_out_at: context.checked_out_at, draft: context.draft });
      setNotice("");
    }).catch(() => setNotice("Não foi possível conectar ao servidor. Verifique a conexão e tente novamente."));
  }, []);

  if (access) return <PartnerExecutionFlow access={access} apiAccess={{ token: access.token, code: access.code }} onLocalComplete={() => undefined} />;
  return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-5"><section className="w-full max-w-md rounded-2xl border bg-white p-7 shadow-xl shadow-slate-900/10"><p className="text-xs font-semibold tracking-[.16em] text-cyan-700">ONEIT · ACESSO DE CAMPO</p><h1 className="mt-2 text-2xl font-semibold">Confirmando atendimento</h1><p role="status" aria-live="polite" className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{notice}</p></section></main>;
}
