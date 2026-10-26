"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function subscribeConnection(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function PwaStatus() {
  const online = useSyncExternalStore(subscribeConnection, () => navigator.onLine, () => true);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const onInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    };
    const onInstalled = () => { setInstallEvent(null); setNotice("Aplicativo instalado."); };
    const onSubmit = (event: SubmitEvent) => {
      const queuedCheckIn = event.target instanceof HTMLFormElement && event.target.dataset.offlineQueue === "true";
      if (!navigator.onLine && !queuedCheckIn) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setNotice("Envio bloqueado: sem conexão. Os dados não foram salvos; mantenha esta tela aberta e tente após reconectar.");
      }
    };
    window.addEventListener("beforeinstallprompt", onInstall);
    window.addEventListener("appinstalled", onInstalled);
    document.addEventListener("submit", onSubmit, true);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => setNotice("Proteção de navegação offline indisponível. Verifique a conexão e recarregue."));
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstall);
      window.removeEventListener("appinstalled", onInstalled);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, []);

  async function install() {
    if (!installEvent) return;
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      setNotice(choice.outcome === "accepted" ? "Instalação solicitada ao navegador." : "Instalação cancelada; você pode continuar no navegador.");
    } catch {
      setNotice("Instalação indisponível. Use o menu do navegador para adicionar à tela inicial.");
    } finally { setInstallEvent(null); }
  }

  return <aside aria-label="Conectividade e instalação" className="border-b bg-white px-4 py-2 text-xs text-slate-700 sm:px-8">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p role="status" aria-live="polite" className={online ? "text-emerald-700" : "font-semibold text-amber-800"}>{online ? "● Online" : "● Sem conexão — envios estão bloqueados"}</p>
      <details><summary className="cursor-pointer text-slate-500 hover:text-slate-800">Instalação e status</summary>
        <div className="mt-2 max-w-2xl rounded-lg bg-slate-50 p-3 text-slate-700">
          <p>{online ? "A rede do dispositivo está disponível; confirmações de servidor continuam necessárias." : "Check-ins e materiais podem entrar na fila local. Fotos e demais envios exigem conexão; não feche formulários preenchidos."}</p>
          {installEvent ? <button type="button" onClick={install} className="mt-3 min-h-10 rounded bg-cyan-700 px-3 py-2 text-sm font-semibold text-white">Instalar aplicativo</button> : <p className="mt-2">Use o menu do navegador para adicionar o OneIT à tela inicial.</p>}
        </div>
      </details>
    </div>
    {notice ? <p role="status" className="mt-2 text-amber-800">{notice}</p> : null}
  </aside>;
}
