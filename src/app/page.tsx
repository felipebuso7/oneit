import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

export default function Home() {
  if (process.env.NODE_ENV === "production") {
    if (process.env.VERCEL_ENV === "preview" && process.env.ONEIT_PREVIEW_MODE === "demo") redirect("/demo");
    redirect("/portal");
  }
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100 sm:px-12">
      <section className="mx-auto max-w-4xl">
        <Image src="/brand/oneit-white.png" alt="OneIT" width={240} height={134} priority className="h-20 w-48 object-contain object-left" />
        <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">Gestão de Serviços e Operações</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">Uma plataforma para operações de campo, ITSM e governança, com segregação por organização, rastreabilidade e segurança desde a base.</p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/portal" className="inline-flex rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-300">Entrar no portal</Link>
          <Link href="/demo" className="inline-flex rounded-lg border border-slate-600 px-5 py-3 font-semibold text-slate-100 hover:border-slate-400 hover:bg-slate-900">Abrir demonstração</Link>
        </div>
        <p className="mt-4 max-w-2xl text-sm text-slate-400">A demonstração é isolada e usa dados locais deste navegador. Para a operação persistente, use o portal autenticado.</p>
      </section>
    </main>
  );
}
