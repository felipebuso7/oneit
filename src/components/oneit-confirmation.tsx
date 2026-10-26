import type { ReactNode } from "react";

type OneitConfirmationProps = { title: string; description?: string; confirmLabel?: string; cancelLabel?: string; onConfirm: () => void; onCancel: () => void; children?: ReactNode };

export function OneitConfirmation({ title, description, confirmLabel = "Confirmar", cancelLabel = "Cancelar", onConfirm, onCancel, children }: OneitConfirmationProps) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4" role="presentation"><div className="w-full max-w-md rounded-[var(--oneit-radius-lg)] bg-white p-6 shadow-[var(--oneit-shadow-md)]" role="dialog" aria-modal="true" aria-labelledby="oneit-confirmation-title"><h2 id="oneit-confirmation-title" className="text-lg font-semibold text-[var(--oneit-petrol-950)]">{title}</h2>{description && <p className="mt-2 text-sm text-slate-600">{description}</p>}{children && <div className="mt-4">{children}</div>}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onCancel} className="oneit-btn oneit-btn--secondary">{cancelLabel}</button><button type="button" onClick={onConfirm} className="oneit-btn oneit-btn--primary">{confirmLabel}</button></div></div></div>;
}
