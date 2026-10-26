import Image from "next/image";

import { updatePassword } from "../login/actions";

type ResetPasswordPageProps = {
  searchParams: Promise<{ message?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { message } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 p-6 text-slate-100">
      <form action={updatePassword} aria-labelledby="reset-title" className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">
        <Image src="/brand/oneit-white.png" alt="OneIT" width={200} height={112} priority className="h-14 w-36 object-contain object-left" />
        <h1 id="reset-title" className="mt-3 text-2xl font-semibold">Criar nova senha</h1>
        <p className="mt-2 text-sm text-slate-400">Use uma senha forte com pelo menos 12 caracteres.</p>
        {message ? <p className="mt-5 rounded-md bg-amber-950/50 p-3 text-sm text-amber-200">{message}</p> : null}
        <label className="mt-6 block text-sm font-medium" htmlFor="password">Nova senha</label>
        <input className="mt-2 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30" id="password" name="password" type="password" autoComplete="new-password" minLength={12} required />
        <label className="mt-4 block text-sm font-medium" htmlFor="confirmation">Confirmar nova senha</label>
        <input className="mt-2 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30" id="confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={12} required />
        <button className="mt-6 min-h-11 w-full rounded-md bg-cyan-300 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-slate-900" type="submit">Atualizar senha</button>
      </form>
    </main>
  );
}
