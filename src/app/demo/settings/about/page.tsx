"use client";

import { useEffect, useState } from "react";
import { DemoSidebar } from "@/components/demo-sidebar";

type Version = { version: string; commit: string; builtAt: string; environment: string; deploymentId: string; sourceFingerprint: string };

export default function AboutOneitPage() {
  const [version, setVersion] = useState<Version | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/version", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Versão indisponível");
        return response.json() as Promise<Version>;
      })
      .then(setVersion)
      .catch(() => setError("Não foi possível identificar a versão deste servidor."));
  }, []);

  return <main className="min-h-screen bg-[#f5f7fa] text-slate-900">
    <DemoSidebar active="about" />
    <div data-oneit-sidebar-offset className="min-h-screen min-w-0">
      <header className="border-b border-slate-200 bg-white px-5 py-5 lg:px-8"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#0b4b78]">Administração / Configurações</p><h1 className="mt-1 text-2xl font-semibold text-[#062c59]">Sobre o OneIT</h1><p className="mt-1 text-sm text-slate-600">Identificação da versão servida neste endereço.</p></header>
      <section className="max-w-3xl p-4 lg:p-7" aria-live="polite">
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
        {!version && !error && <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm">Consultando versão…</p>}
        {version && <dl className="grid gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white text-sm sm:grid-cols-[190px_1fr] [&>*]:border-b [&>*]:border-slate-100 [&>*]:p-4">
          <dt className="font-semibold text-slate-600">Versão</dt><dd>{version.version}</dd>
          <dt className="font-semibold text-slate-600">Ambiente</dt><dd>{version.environment}</dd>
          <dt className="font-semibold text-slate-600">Build / início</dt><dd>{new Date(version.builtAt).toLocaleString("pt-BR")}</dd>
          <dt className="font-semibold text-slate-600">Commit</dt><dd className="break-all font-mono">{version.commit}</dd>
          <dt className="font-semibold text-slate-600">Deploy</dt><dd className="break-all font-mono">{version.deploymentId}</dd>
          <dt className="font-semibold text-slate-600">Fonte</dt><dd className="break-all font-mono">{version.sourceFingerprint}</dd>
        </dl>}
        <p className="mt-4 text-xs text-slate-500">Em desenvolvimento, a impressão digital da fonte é calculada ao consultar esta tela. Em produção, corresponde ao conteúdo compilado no build.</p>
      </section>
    </div>
  </main>;
}
