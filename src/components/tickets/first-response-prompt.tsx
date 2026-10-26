"use client";

import { useState } from "react";

import { recordFirstTicketResponse } from "@/app/(portal)/portal/tickets/[id]/actions";

export function FirstResponsePrompt({ ticketId }: { ticketId: string }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return <div role="dialog" aria-modal="true" aria-labelledby="first-response-title" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-5"><section className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"><h2 id="first-response-title" className="text-xl font-semibold">Iniciar primeiro atendimento?</h2><p className="mt-2 text-sm text-slate-600">Ao confirmar, o início será registrado no histórico e no SLA de resposta deste chamado.</p><div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setDismissed(true)} className="rounded-lg border px-4 py-2 text-sm font-semibold">Não</button><form action={recordFirstTicketResponse}><input type="hidden" name="ticketId" value={ticketId} /><button className="rounded-lg bg-[#092f40] px-4 py-2 text-sm font-semibold text-white">Sim, iniciar</button></form></div></section></div>;
}
