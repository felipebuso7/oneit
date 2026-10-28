import type { ReactNode } from "react";

type OneitStatusBadgeProps = {
  children: ReactNode;
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
  className?: string;
};

const toneClass = {
  neutral: "bg-slate-100 text-slate-700",
  info: "bg-sky-100 text-sky-800",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-900",
  danger: "bg-red-100 text-red-800",
} as const;

export function OneitStatusBadge({ children, tone = "neutral", className = "" }: OneitStatusBadgeProps) {
  return <span className={`inline-flex min-h-6 items-center rounded-full px-2.5 py-1 text-xs font-semibold leading-none ${toneClass[tone]} ${className}`} data-oneit-status={tone}>{children}</span>;
}
