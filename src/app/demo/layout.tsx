import type { ReactNode } from "react";

export default function DemoLayout({ children }: Readonly<{ children: ReactNode }>) {
  const preview = process.env.VERCEL_ENV === "preview" && process.env.ONEIT_PREVIEW_MODE === "demo";
  return <>
    {children}
    {preview ? <div className="pointer-events-none fixed bottom-3 left-1/2 z-[100] w-[min(92vw,660px)] -translate-x-1/2 rounded-lg border border-slate-300 bg-white/95 px-4 py-2 text-center text-xs font-semibold text-slate-800 shadow-lg" role="status">
      Prévia de demonstração · Dados salvos apenas neste navegador · Não use informações reais
    </div> : null}
  </>;
}
