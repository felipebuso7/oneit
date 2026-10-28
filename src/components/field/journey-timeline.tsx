import { OneitStatusBadge } from "@/components/oneit";

type HistoryEvent = { next_status: string | null; created_at: string };

const steps = [
  { key: "travel", label: "Deslocamento", statuses: ["TRAVEL_STARTED"] },
  { key: "arrival", label: "Chegada", statuses: ["ON_SITE"] },
  { key: "work", label: "Atendimento", statuses: ["WORK_STARTED", "IN_PROGRESS"] },
  { key: "evidence", label: "Evidências", statuses: ["IN_PROGRESS"] },
  { key: "checkout", label: "Checkout", statuses: ["TECHNICALLY_COMPLETED", "COMPLETED"] },
] as const;

function formatTime(value?: string) {
  if (!value) return null;
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function JourneyTimeline({ status, history, evidenceCount }: { status: string; history: HistoryEvent[]; evidenceCount: number }) {
  const timestamps = new Map<string, string>();
  for (const event of history) {
    if (event.next_status && !timestamps.has(event.next_status)) timestamps.set(event.next_status, event.created_at);
  }
  const currentIndex = steps.findIndex((step) => step.statuses.includes(status as never));
  const evidenceDone = evidenceCount >= 3;

  return <section aria-label="Jornada do atendimento" className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
    <div className="flex items-center justify-between gap-3">
      <p className="text-[11px] font-bold uppercase tracking-[.14em] text-slate-500">Jornada da OS</p>
      <OneitStatusBadge tone={status === "IN_PROGRESS" ? "info" : status === "ON_SITE" ? "warning" : "neutral"}>{status.replaceAll("_", " ")}</OneitStatusBadge>
    </div>
    <ol className="mt-3 grid grid-cols-5 gap-1">
      {steps.map((step, index) => {
        const isEvidence = step.key === "evidence";
        const done = isEvidence ? evidenceDone : index <= currentIndex && currentIndex >= 0;
        const timestamp = isEvidence ? undefined : step.statuses.map((value) => timestamps.get(value)).find(Boolean);
        const current = index === currentIndex || (isEvidence && currentIndex >= 3 && !evidenceDone);
        return <li key={step.key} className="min-w-0 text-center">
          <div className={`mx-auto grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${done ? "bg-emerald-600 text-white" : current ? "bg-cyan-700 text-white" : "bg-slate-200 text-slate-500"}`} aria-label={done ? `${step.label} concluído` : `${step.label} pendente`}>{done ? "✓" : index + 1}</div>
          <p className={`mt-1 truncate text-[10px] font-semibold leading-tight ${done ? "text-emerald-800" : "text-slate-500"}`}>{step.label}</p>
          {timestamp ? <p className="mt-0.5 text-[9px] text-slate-500">{formatTime(timestamp)}</p> : null}
          {isEvidence && !done ? <p className="mt-0.5 text-[9px] text-slate-500">{evidenceCount}/3 fotos</p> : null}
        </li>;
      })}
    </ol>
  </section>;
}
