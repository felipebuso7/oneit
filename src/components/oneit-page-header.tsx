import type { ReactNode } from "react";

type OneitPageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  breadcrumb?: ReactNode;
  actions?: ReactNode;
};

export function OneitPageHeader({ title, description, eyebrow, breadcrumb, actions }: OneitPageHeaderProps) {
  return <header className="oneit-page-header" data-oneit-page-header>
    <div className="oneit-page-header__content min-w-0">
      {breadcrumb && <div className="mb-1 text-xs text-slate-500">{breadcrumb}</div>}
      {eyebrow && <div className="oneit-page-header__eyebrow">{eyebrow}</div>}
      <h1 className="oneit-page-header__title">{title}</h1>
      {description && <p className="mt-1 max-w-3xl text-sm text-slate-600">{description}</p>}
    </div>
    {actions && <div className="oneit-page-header__actions flex shrink-0 flex-wrap items-center gap-2" data-oneit-page-actions>{actions}</div>}
  </header>;
}
