import type { ReactNode } from "react";

type OneitFilterBarProps = { search?: ReactNode; filters?: ReactNode; actions?: ReactNode };

export function OneitFilterBar({ search, filters, actions }: OneitFilterBarProps) {
  return <div className="flex flex-wrap items-center gap-3 border-b border-[var(--oneit-line)] pb-4" data-oneit-filter-bar>
    {search && <div className="min-w-[220px] flex-1">{search}</div>}
    {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
    {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
  </div>;
}
