import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100 sm:px-12">
      <section className="mx-auto max-w-4xl">
        <Image src="/brand/oneit-white.png" alt="OneIT" width={240} height={134} priority className="h-20 w-48 object-contain object-left" />
        <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">Gestão de Serviços e Operações</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">Uma plataforma para operações de campo, ITSM e governança, com segregação por organização, rastreabilidade e segurança desde a base.</p>
        <Link href="/demo" className="mt-8 inline-flex rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-300">Abrir demonstração do portal</Link>
      </section>
    </main>
  );
}
