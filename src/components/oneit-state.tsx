import type { ReactNode } from "react";

type StateProps = { title: string; description?: string; action?: ReactNode };

export function OneitEmptyState({ title, description, action }: StateProps) {
  return <div className="oneit-card oneit-state oneit-state--empty flex min-h-32 flex-col items-center justify-center p-6 text-center" data-oneit-state="empty"><span className="oneit-state__icon" aria-hidden="true">—</span><p className="font-semibold text-[var(--oneit-petrol-900)]">{title}</p>{description && <p className="mt-1 max-w-md text-sm text-slate-600">{description}</p>}{action && <div className="mt-4">{action}</div>}</div>;
}

export function OneitLoadingState({ title = "Carregando…" }: { title?: string }) {
  return <div className="oneit-card oneit-state oneit-state--loading flex min-h-32 items-center justify-center p-6 text-sm text-slate-600" role="status" data-oneit-state="loading"><span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-[var(--oneit-petrol-700)]" aria-hidden="true" />{title}</div>;
}

export function OneitErrorState({ title = "Não foi possível carregar este conteúdo.", description, action }: StateProps) {
  return <div className="oneit-card oneit-state oneit-state--error border-red-200 p-6" role="alert" data-oneit-state="error"><span className="oneit-state__icon" aria-hidden="true">!</span><p className="font-semibold text-red-800">{title}</p>{description && <p className="mt-1 text-sm text-red-700">{description}</p>}{action && <div className="mt-4">{action}</div>}</div>;
}
