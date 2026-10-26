import type { ReactNode } from "react";

type OneitDataTableProps = { headers: readonly ReactNode[]; children: ReactNode; caption?: string };

export function OneitDataTable({ headers, children, caption }: OneitDataTableProps) {
  return <div className="overflow-x-auto rounded-[var(--oneit-radius-lg)] border border-[var(--oneit-line)] bg-white" data-oneit-data-table>
    <table className="min-w-full border-collapse text-left text-sm">
      {caption && <caption className="sr-only">{caption}</caption>}
      <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600"><tr>{headers.map((header, index) => <th key={index} scope="col" className="whitespace-nowrap border-b border-[var(--oneit-line)] px-4 py-3">{header}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-100">{children}</tbody>
    </table>
  </div>;
}
