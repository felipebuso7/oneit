"use client";
/* eslint-disable react-hooks/set-state-in-effect -- hidrata a confirmação do despacho salva no navegador demonstrativo. */

import Link from "next/link";
import { useEffect, useState } from "react";
import { DemoSidebar } from "@/components/demo-sidebar";
import { recordFieldCommunication } from "@/lib/demo/field-communications";
import { isShareableAccessLink, whatsappRecipient } from "@/lib/field-service/dispatch-sharing";

type DispatchSummary = {
  ticket: string;
  serviceOrderId?: string;
  subject: string;
  technician: string;
  technicianPhone?: string;
  technicianKind?: string;
  company: string;
  department: string;
  address: string;
  plannedAt: string;
  window: string;
  localContact: string;
  localPhone: string;
};

const summaryKey = "oneit.demo.field-last-dispatch.v1";

export default function DispatchConfirmedPage() {
  const [summary, setSummary] = useState<DispatchSummary | null>(null);
  const [phone, setPhone] = useState("");
  const [notice, setNotice] = useState("Revise o agendamento e compartilhe o link de atendimento com o técnico.");
  const [secureLink, setSecureLink] = useState("");
  const [secureCode, setSecureCode] = useState("");
  const [creatingAccess, setCreatingAccess] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(summaryKey) ?? "null") as DispatchSummary | null;
      if (saved?.ticket) {
        setSummary(saved);
        setPhone(saved.technicianPhone ?? "");
      } else {
        setNotice("Nenhuma visita foi atribuída nesta sessão. Retorne à fila para iniciar um despacho.");
      }
    } catch {
      setNotice("Não foi possível recuperar a confirmação do despacho.");
    }
  }, []);

  function openWhatsApp() {
    if (!summary) return;
    const recipient = whatsappRecipient(phone);
    if (!recipient) {
      setNotice("Informe um celular válido com DDD para abrir o WhatsApp do técnico.");
      return;
    }
    if (!secureLink || !isShareableAccessLink(secureLink)) {
      setNotice("Para compartilhar com outro dispositivo, gere um acesso seguro em um endereço acessível ao técnico. Links demonstrativos e localhost não funcionam no celular remoto.");
      return;
    }
    localStorage.setItem("oneit.demo.field-active-ticket", summary.ticket);
    const message = [
      "ONEIT · Nova visita atribuída",
      `OS: ${summary.ticket}`,
      `Serviço: ${summary.subject}`,
      `Empresa/local: ${summary.company} · ${summary.department}`,
      `Endereço: ${summary.address}`,
      `Agendamento: ${summary.plannedAt} · ${summary.window}`,
      `Contato no local: ${summary.localContact} · ${summary.localPhone}`,
      "",
      "Acesse o link abaixo para iniciar o deslocamento, registrar evidências, assinatura e encerramento da OS:",
      secureLink,
    ].join("\n");
    recordFieldCommunication({
      ticket: summary.ticket,
      channel: "WhatsApp",
      recipient: summary.technician,
      phone: recipient,
      status: "Mensagem preparada para envio",
      body: "Resumo do despacho preparado. Link de acesso temporário omitido do histórico local.",
    });
    window.open(`https://wa.me/${recipient}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    setNotice("Conversa preparada. Se o WhatsApp não abrir, verifique o bloqueio de janelas. O envio e a entrega devem ser confirmados no WhatsApp. Informe o código ao técnico separadamente.");
  }

  async function createSecureAccess() {
    if (!summary?.serviceOrderId) return;
    setCreatingAccess(true);
    try {
      const response = await fetch("/api/field-service/partner/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceOrderId: summary.serviceOrderId, validForMinutes: 480 }),
      });
      const payload = await response.json().catch(() => ({})) as { access?: { token?: string; code?: string; validForMinutes?: number }; code?: string };
      if (!response.ok || !payload.access?.token || !payload.access.code) {
        setNotice(`Não foi possível gerar o acesso seguro: ${payload.code ?? "erro de comunicação"}.`);
        return;
      }
      const url = new URL("/field-service/partner/access", window.location.origin);
      // O token fica no fragmento: não é enviado em Referer nem para o servidor de páginas.
      url.hash = `token=${encodeURIComponent(payload.access.token)}`;
      setSecureLink(url.toString());
      setSecureCode(payload.access.code);
      setNotice(`Acesso externo seguro gerado, válido por ${payload.access.validForMinutes ?? 480} minutos. Um novo acesso revoga o anterior.`);
    } catch {
      setNotice("Não foi possível conectar ao servidor para gerar o acesso seguro.");
    } finally {
      setCreatingAccess(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <DemoSidebar active="field-service" />
      <div data-oneit-sidebar-offset className="ml-64 min-h-screen">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 bg-white px-6 py-4">
          <div>
            <p className="text-xs font-semibold tracking-[.15em] text-orange-500">ONEIT · FIELD SERVICE</p>
            <h1 className="mt-1 text-xl font-semibold">Visita atribuída</h1>
            <p className="mt-1 text-sm text-slate-500">Última etapa do despacho: comunicar o técnico e acompanhar a execução.</p>
          </div>
          <Link href="/demo/field-service/queue-v2" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Ir para fila Field</Link>
        </header>

        <section className="mx-auto max-w-4xl p-5 sm:p-8">
          <p role="status" className="rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-950">{notice}</p>
          {summary ? (
            <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#0a5261]">Resumo da visita</p>
                <h2 className="mt-2 text-lg font-semibold">{summary.ticket} · {summary.subject}</h2>
                <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                  <div><dt className="text-slate-500">Técnico</dt><dd className="mt-1 font-semibold">{summary.technician} · {summary.technicianKind}</dd></div>
                  <div><dt className="text-slate-500">Agendamento</dt><dd className="mt-1 font-semibold">{summary.plannedAt} · {summary.window}</dd></div>
                  <div><dt className="text-slate-500">Local</dt><dd className="mt-1 font-semibold">{summary.company} · {summary.department}</dd></div>
                  <div><dt className="text-slate-500">Contato</dt><dd className="mt-1 font-semibold">{summary.localContact} · {summary.localPhone}</dd></div>
                </dl>
                <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm"><p className="font-semibold">Endereço de atendimento</p><p className="mt-1 text-slate-600">{summary.address}</p></div>
              </section>

              <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#0a5261]">Enviar ao técnico</p>
                <p className="mt-2 text-sm text-slate-600">A mensagem contém OS, serviço, local, janela, contato e o link para o atendimento mobile.</p>
                <label className="mt-5 block text-sm font-semibold">Celular do técnico
                  <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(11) 99999-9999" className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 font-normal" />
                </label>
                {summary.technicianKind === "Parceiro" ? <p className="mt-2 text-xs text-amber-800">Técnico parceiro: confirme ou informe o número antes do envio.</p> : null}
                {summary.serviceOrderId ? <div className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-xs text-cyan-950"><p className="font-semibold">Acesso externo seguro</p><p className="mt-1">Gere um link temporário para esta OS. Um novo link invalida o anterior.</p><button type="button" onClick={() => void createSecureAccess()} disabled={creatingAccess} className="mt-3 rounded-md border border-cyan-700 bg-white px-3 py-2 text-xs font-semibold text-cyan-950 disabled:opacity-60">{creatingAccess ? "Gerando acesso…" : secureLink ? "Gerar novo acesso" : "Gerar acesso seguro"}</button>{secureCode ? <p className="mt-2">Código temporário: <b>{secureCode}</b></p> : null}</div> : <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Modo demonstrativo: o link técnico funciona somente neste navegador. Para envio a outro celular, a OS precisa estar persistida no servidor.</p>}
                <button type="button" onClick={openWhatsApp} className="mt-5 w-full rounded-lg bg-[#0a5261] px-4 py-3 text-sm font-semibold text-white">Enviar resumo pelo WhatsApp</button>
                <Link href="/demo/field-service/technician" className="mt-3 block text-center text-sm font-semibold text-[#123f99]">Abrir visão do técnico neste dispositivo →</Link>
              </aside>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
