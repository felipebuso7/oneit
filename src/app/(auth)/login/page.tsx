import { login } from "./actions";
import Image from "next/image";

type LoginPageProps = {
  searchParams: Promise<{ message?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { message, error } = await searchParams;
  const selfHosted = process.env.ONEIT_DEPLOYMENT_MODE === "self_hosted";

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 p-6 text-slate-100">
      <form action={login} className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl" aria-labelledby="login-title">
        <Image src="/brand/oneit-white.png" alt="OneIT" width={200} height={112} priority className="h-14 w-36 object-contain object-left" />
        <h1 id="login-title" className="mt-3 text-2xl font-semibold">Acessar a operação</h1>
        <p className="mt-2 text-sm text-slate-400">Use a conta corporativa autorizada para sua organização.</p>
        {message ? <p className="mt-5 rounded-md bg-amber-950/50 p-3 text-sm text-amber-200">{message}</p> : null}
        {error === "environment" ? <p className="mt-5 rounded-md bg-rose-950/50 p-3 text-sm text-rose-200">O ambiente de produção não está configurado para autenticação. Contate o administrador.</p> : error ? <p className="mt-5 rounded-md bg-rose-950/50 p-3 text-sm text-rose-200">Não foi possível concluir a autenticação. Tente novamente ou contate o administrador.</p> : null}
        {selfHosted ? <a href="/api/auth/oidc/login?next=/portal" className="mt-6 block w-full rounded-md bg-cyan-300 px-4 py-2 text-center font-semibold text-slate-950 hover:bg-cyan-200">Entrar com OneIT ID</a> : <>
          <label className="mt-6 block text-sm font-medium" htmlFor="email">E-mail</label>
          <input className="mt-2 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30" id="email" name="email" type="email" autoComplete="email" required />
          <label className="mt-4 block text-sm font-medium" htmlFor="password">Senha</label>
          <input className="mt-2 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30" id="password" name="password" type="password" autoComplete="current-password" required />
          <button className="mt-6 min-h-11 w-full rounded-md bg-cyan-300 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-slate-900" type="submit">Entrar</button>
          <a className="mt-4 block text-center text-sm text-cyan-200 underline underline-offset-4 hover:text-cyan-100" href="/forgot-password">Esqueci minha senha</a>
        </>}
      </form>
    </main>
  );
}
