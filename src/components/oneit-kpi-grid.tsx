import type { ReactNode } from "react";

export type OneitKpiItem = {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "attention" | "positive";
};

export function OneitKpiGrid({ items }: { items: readonly OneitKpiItem[] }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-oneit-kpi-grid>
    {items.map((item) => <article key={item.label} className={`oneit-card relative overflow-hidden p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${item.tone === "attention" ? "border-amber-200 bg-amber-50/40" : item.tone === "positive" ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200"}`}>
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${item.tone === "attention" ? "bg-amber-500" : item.tone === "positive" ? "bg-emerald-500" : "bg-sky-700"}`} />
      <p className="text-sm text-slate-600">{item.label}</p>
      <p className={`mt-2 text-3xl font-semibold ${item.tone === "attention" ? "text-amber-950" : item.tone === "positive" ? "text-emerald-950" : "text-slate-900"}`}>{item.value}</p>
      {item.hint && <p className="mt-1 text-xs text-slate-500">{item.hint}</p>}
    </article>)}
  </div>;
}
