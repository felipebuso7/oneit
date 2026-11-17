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

  // Connectivity and PWA listeners remain active, but the diagnostic banner is
  // intentionally hidden from the operational portal UI.
  void online;
  void notice;
  void installEvent;
  void install;
  return null;
}
