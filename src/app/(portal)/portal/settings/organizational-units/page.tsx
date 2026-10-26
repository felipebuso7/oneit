import Link from "next/link";

import { requireUser } from "@/lib/auth/current-user";
import { createOrganizationalUnit, updateOrganizationalUnit } from "./actions";

type PageProps = { searchParams: Promise<{ message?: string }> };

const labels = { COMPANY: "Empresa", DEPARTMENT: "Departamento", COST_CENTER: "Centro de custo", WORK_SITE: "Local de trabalho" } as const;

export default async function OrganizationalUnitsPage({ searchParams }: PageProps) {
  const [{ supabase, user }, { message }] = await Promise.all([requireUser(), searchParams]);
  const { data: memberships } = await supabase.from("user_roles").select("organization_id").eq("user_id", user.id).in("role", ["SUPER_ADMIN", "ORG_ADMIN"]);
  const organizationIds = [...new Set((memberships ?? []).map((item) => item.organization_id))];
  const [{ data: organizations }, { data: units }] = await Promise.all([
    organizationIds.length ? supabase.from("organizations").select("id, display_name").in("id", organizationIds).eq("active", true).order("display_name") : Promise.resolve({ data: [] }),
    organizationIds.length ? supabase.from("organization_units").select("id, organization_id, unit_type, code, name, active").in("organization_id", organizationIds).order("unit_type").order("name") : Promise.resolve({ data: [] }),
  ]);
  const organizationName = new Map((organizations ?? []).map((item) => [item.id, item.display_name]));

  return <main className="mx-auto max-w-6xl p-5 sm:p-8">
    <Link href="/portal/settings" className="text-sm font-medium text-[#0b4a64]">← Configurações</Link>
    <p className="mt-5 text-sm font-semibold tracking-[.15em] text-orange-500">ESTRUTURA ORGANIZACIONAL</p>
    <h1 className="mt-2 text-3xl font-semibold">Empresas e departamentos</h1>
    <p className="mt-2 max-w-3xl text-sm text-slate-600">Cadastre a estrutura que será reutilizada por colaboradores, ativos, centros de custo e formulários operacionais. Cada unidade pertence a uma organização.</p>
    {message ? <p role="status" className="mt-4 rounded-lg bg-sky-50 p-3 text-sm text-sky-900">{message}</p> : null}
    <section className="mt-6 grid gap-5 lg:grid-cols-[380px_1fr]">
      <form action={createOrganizationalUnit} className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Nova unidade</h2>
        <label className="block text-sm font-medium">Organização<select name="organizationId" required defaultValue="" className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white p-2.5"><option value="" disabled>Selecione</option>{(organizations ?? []).map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}</select></label>
        <label className="block text-sm font-medium">Tipo<select name="type" required defaultValue="DEPARTMENT" className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white p-2.5"><option value="COMPANY">Empresa</option><option value="DEPARTMENT">Departamento</option><option value="COST_CENTER">Centro de custo</option><option value="WORK_SITE">Local de trabalho</option></select></label>
        <label className="block text-sm font-medium">Código<input name="code" required maxLength={100} placeholder="Ex.: TI" className="mt-1.5 w-full rounded-lg border border-slate-300 p-2.5" /></label>
        <label className="block text-sm font-medium">Nome<input name="name" required maxLength={240} placeholder="Ex.: Tecnologia da Informação" className="mt-1.5 w-full rounded-lg border border-slate-300 p-2.5" /></label>
        <button className="w-full rounded-lg bg-[#092f40] px-4 py-2.5 text-sm font-semibold text-white">Salvar unidade</button>
      </form>
      <section className="overflow-hidden rounded-xl border bg-white shadow-sm"><div className="border-b p-5"><h2 className="font-semibold">Unidades cadastradas</h2><p className="mt-1 text-sm text-slate-500">Estas opções passam a compor os vínculos de ativos e colaboradores. A inativação preserva o histórico e retira a unidade dos novos cadastros.</p></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-4">Tipo</th><th className="p-4">Código e nome</th><th className="p-4">Organização</th><th className="p-4">Status</th><th className="p-4">Ação</th></tr></thead><tbody>{(units ?? []).map((unit) => <tr key={unit.id} className="border-t"><td className="p-4">{labels[unit.unit_type as keyof typeof labels] ?? unit.unit_type}</td><td className="p-4"><form action={updateOrganizationalUnit} className="flex min-w-72 gap-2"><input type="hidden" name="organizationUnitId" value={unit.id} /><input type="hidden" name="active" value={String(unit.active)} /><input name="code" defaultValue={unit.code} aria-label="Código" className="w-20 rounded border p-1.5 font-mono text-xs" required /><input name="name" defaultValue={unit.name} aria-label="Nome" className="min-w-44 rounded border p-1.5" required /><button className="text-sm font-medium text-[#0b4a64]">Salvar</button></form></td><td className="p-4 text-slate-600">{organizationName.get(unit.organization_id) ?? "—"}</td><td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${unit.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{unit.active ? "Ativo" : "Inativo"}</span></td><td className="p-4"><form action={updateOrganizationalUnit} className="flex gap-2"><input type="hidden" name="organizationUnitId" value={unit.id} /><input type="hidden" name="code" value={unit.code} /><input type="hidden" name="name" value={unit.name} /><input type="hidden" name="active" value={unit.active ? "false" : "true"} /><button className="text-sm font-medium text-[#0b4a64]">{unit.active ? "Inativar" : "Reativar"}</button></form></td></tr>)}</tbody></table></div>{!(units ?? []).length ? <p className="p-5 text-sm text-slate-500">Nenhuma unidade cadastrada para suas organizações.</p> : null}</section>
    </section>
  </main>;
}
