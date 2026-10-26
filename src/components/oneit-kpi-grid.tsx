import type { ReactNode } from "react";

export type OneitKpiItem = {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "attention" | "positive";
};

export function OneitKpiGrid({ items }: { items: readonly OneitKpiItem[] }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-oneit-kpi-grid>
    {items.map((item) => <article key={item.label} className={`oneit-card p-5 ${item.tone === "attention" ? "border-amber-200" : item.tone === "positive" ? "border-emerald-200" : ""}`}>
      <p className="text-sm text-slate-600">{item.label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{item.value}</p>
      {item.hint && <p className="mt-1 text-xs text-slate-500">{item.hint}</p>}
    </article>)}
  </div>;
}
