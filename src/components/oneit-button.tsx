import type { ButtonHTMLAttributes, ReactNode } from "react";

type OneitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "action" | "danger";
  loading?: boolean;
  children: ReactNode;
};

const variants = { primary: "oneit-btn--primary", secondary: "oneit-btn--secondary", action: "oneit-btn--action", danger: "bg-red-700 text-white hover:bg-red-800" } as const;

export function OneitButton({ variant = "primary", loading = false, disabled, children, className = "", ...props }: OneitButtonProps) {
  return <button {...props} disabled={disabled || loading} className={`oneit-btn ${variants[variant]} ${className}`} aria-busy={loading || undefined}>{loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />}{children}</button>;
}
