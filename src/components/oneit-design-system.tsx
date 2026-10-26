import type { ReactNode } from "react";
export { OneitPageHeader } from "@/components/oneit-page-header";
export { OneitStatusBadge } from "@/components/oneit-status-badge";

export function OneitMetricCard({ label, value, hint, tone = "default" }: { label: string; value: ReactNode; hint?: string; tone?: "default" | "success" | "warning" | "danger" | "info" }) {
  const toneClass = tone === "success" ? "border-emerald-200 bg-emerald-50" : tone === "warning" ? "border-amber-200 bg-amber-50" : tone === "danger" ? "border-red-200 bg-red-50" : tone === "info" ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white";
  return <article className={`oneit-card ${toneClass} p-4`}><p className="text-[11px] font-bold uppercase tracking-[.12em] text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-[#062c59]">{value}</p>{hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}</article>;
}

