import { OneitPageHeader } from "@/components/oneit-page-header";
import { requireUser } from "@/lib/auth/current-user";
import { deleteServiceLevelPolicy, saveServiceLevelPolicy } from "./actions";

type Props = { searchParams: Promise<{ message?: string }> };

export default async function ServiceLevelPage({ searchParams }: Props) {
  const [{ supabase, user }, { message }] = await Promise.all([requireUser(), searchParams]);
  const { data: roles } = await supabase.from("user_roles").select("organization_id").eq("user_id", user.id).in("role", ["ORG_ADMIN", "SUPER_ADMIN"]);
  if (!roles?.length) return <section className="p-8"><h1 className="text-2xl font-semibold">Cadastrar SLA</h1><p className="mt-3">Somente administradores organizacionais configuram SLAs.</p></section>;
  const ids = roles.map((role) => role.organization_id);
  const { data: policies } = await supabase.from("service_level_policies").select("id,name,duration_value,duration_unit,active").in("organization_id", ids).order("name");
  return <section className="mx-auto max-w-5xl p-5 sm:p-8">
    <OneitPageHeader eyebrow="CONFIGURAÇÕES · ATENDIMENTO" title="Cadastrar SLA" description="Gerencie os prazos de atendimento disponíveis na abertura de chamados." />
    {message ? <p role="status" className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">{message}</p> : null}
    <div className="mt-6 grid gap-5 lg:grid-cols-[300px_1fr]">
      <form action={saveServiceLevelPolicy} className="oneit-card grid content-start gap-4 p-5">
        <div><h2 className="font-semibold text-slate-900">Adicionar SLA</h2><p className="mt-1 text-xs text-slate-500">Defina o prazo padrão para novos chamados.</p></div>
        <label className="grid gap-1 text-sm font-medium text-slate-700">Nome do SLA<input name="name" required minLength={2} maxLength={120} placeholder="Ex.: SLA prioritário" className="h-11 rounded-lg border border-slate-300 px-3 text-sm font-normal" /></label>
        <div className="grid grid-cols-2 gap-3"><label className="grid gap-1 text-sm font-medium text-slate-700">Tempo<input name="durationValue" required type="number" min="1" step="1" placeholder="Ex.: 2" className="h-11 rounded-lg border border-slate-300 px-3 text-sm font-normal" /></label><label className="grid gap-1 text-sm font-medium text-slate-700">Unidade<select name="durationUnit" defaultValue="HOURS" className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal"><option value="MINUTES">Minutos</option><option value="HOURS">Horas</option><option value="DAYS">Dias</option></select></label></div>
        <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700"><input name="active" type="checkbox" defaultChecked value="true" className="h-4 w-4 accent-cyan-700" /> Habilitado</label>
        <button className="h-11 rounded-lg bg-[#092f40] px-4 text-sm font-semibold text-white">Adicionar SLA</button>
      </form>
      <div className="oneit-card overflow-hidden"><div className="border-b p-4"><h2 className="font-semibold">SLAs cadastrados</h2><p className="text-sm text-slate-500">Selecione um registro para editar ou desativar.</p></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Nome do SLA</th><th className="p-3">Tempo</th><th className="p-3">Unidade</th><th className="p-3">Habilitado</th><th className="p-3">Ação</th></tr></thead><tbody>{(policies ?? []).map((policy) => <tr key={policy.id} className="border-t"><td className="p-3 font-medium">{policy.name}</td><td className="p-3">{policy.duration_value}</td><td className="p-3">{policy.duration_unit === "MINUTES" ? "Minutos" : policy.duration_unit === "HOURS" ? "Horas" : "Dias"}</td><td className="p-3">{policy.active ? "Sim" : "Não"}</td><td className="p-3"><div className="flex flex-wrap gap-2"><details><summary className="cursor-pointer rounded border px-2 py-1 text-xs font-semibold">Editar</summary><form action={saveServiceLevelPolicy} className="mt-2 flex flex-wrap gap-2"><input type="hidden" name="policyId" value={policy.id} /><input name="name" required defaultValue={policy.name} className="h-9 rounded border px-2 text-sm" /><input name="durationValue" required type="number" min="1" defaultValue={policy.duration_value} className="h-9 w-20 rounded border px-2 text-sm" /><select name="durationUnit" defaultValue={policy.duration_unit} className="h-9 rounded border px-2 text-sm"><option value="MINUTES">Minutos</option><option value="HOURS">Horas</option><option value="DAYS">Dias</option></select><button className="h-9 rounded bg-[#092f40] px-2 text-xs font-semibold text-white">Salvar</button></form></details>{policy.active ? <form action={deleteServiceLevelPolicy}><input type="hidden" name="policyId" value={policy.id} /><button className="h-9 rounded border border-rose-300 px-2 text-xs font-semibold text-rose-700">Desativar</button></form> : null}</div></td></tr>)}{!(policies ?? []).length ? <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhum SLA cadastrado.</td></tr> : null}</tbody></table></div></div>
    </div>
  </section>;
}
