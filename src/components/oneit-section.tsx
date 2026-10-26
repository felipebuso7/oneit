import type { ReactNode } from "react";

type OneitSectionProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function OneitSection({ title, description, actions, children, className = "" }: OneitSectionProps) {
  return <section className={`oneit-card overflow-hidden ${className}`}>
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--oneit-line)] px-5 py-4">
      <div><h2 className="oneit-section-title">{title}</h2>{description && <p className="mt-1 text-sm text-slate-600">{description}</p>}</div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
    <div className="p-5">{children}</div>
  </section>;
}
