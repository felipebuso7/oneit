import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";

export default async function SupplierPerformanceDashboardPage() {
  const { supabase, user } = await requireUser();
  const { data: roles } = await supabase.from("user_roles").select("organization_id").eq("user_id", user.id).in("role", ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER", "AUDITOR"]);
  const organizationIds = [...new Set((roles ?? []).map((role) => role.organization_id))];
  const [{ data: suppliers }, { data: records }, { data: actions }] = await Promise.all([
    supabase.from("suppliers").select("id,legal_name,criticality,strategic").in("organization_id", organizationIds).eq("status", "ACTIVE").order("legal_name"),
    supabase.from("supplier_sla_records").select("id,supplier_id,compliant,status,created_at").in("organization_id", organizationIds).order("created_at", { ascending: false }).limit(1000),
    supabase.from("supplier_sla_actions").select("id,supplier_id,status,due_date,completed_at").in("organization_id", organizationIds).order("due_date"),
  ]);
  const now = new Date();
  const totalRecords = (records ?? []).length;
  const compliantRecords = (records ?? []).filter((record) => record.compliant).length;
  const breachedRecords = totalRecords - compliantRecords;
  const openActions = (actions ?? []).filter((action) => !["COMPLETED", "CANCELLED"].includes(action.status));
  const overdueActions = openActions.filter((action) => action.due_date && new Date(`${action.due_date}T23:59:59`) < now);
  const cards: Array<[string, string, string]> = [
    ["Cumprimento de SLA", totalRecords ? `${((compliantRecords / totalRecords) * 100).toFixed(1)}%` : "—", `${compliantRecords} conformes de ${totalRecords} medições`],
    ["Descumprimentos", String(breachedRecords), "Registros de SLA não conformes"],
    ["Ações abertas", String(openActions.length), "Tratamentos ainda não concluídos"],
    ["Ações em atraso", String(overdueActions.length), "Prazo vencido sem conclusão"],
  ];
  return <main className="mx-auto max-w-6xl p-5 sm:p-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold tracking-[.15em] text-orange-500">GESTÃO DE FORNECEDORES</p><h1 className="mt-2 text-3xl font-semibold">Painel de desempenho</h1><p className="mt-2 text-sm text-slate-600">Indicadores atuais de cumprimento de SLA e tratamento de falhas por fornecedor.</p></div><div className="flex gap-2"><Link href="/portal/supplier-performance" className="rounded-lg border px-3 py-2 text-sm font-medium text-[#0b4a64]">Registrar SLA</Link><Link href="/portal/supplier-actions" className="rounded-lg bg-[#092f40] px-3 py-2 text-sm font-medium text-white">Gerenciar ações</Link></div></div><section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label,value,note])=><article key={label} className="rounded-xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-600">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p><p className="mt-2 text-xs text-slate-500">{note}</p></article>)}</section><section className="mt-6 overflow-hidden rounded-xl border bg-white"><div className="border-b p-5"><h2 className="font-semibold">Situação por fornecedor</h2><p className="mt-1 text-sm text-slate-500">Use esta visão para priorizar reuniões, escalonamentos e planos de melhoria.</p></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Fornecedor</th><th className="p-4">Conformidade</th><th className="p-4">Falhas</th><th className="p-4">Ações abertas</th><th className="p-4">Atrasadas</th></tr></thead><tbody>{(suppliers ?? []).map((supplier) => { const supplierRecords = (records ?? []).filter((record) => record.supplier_id === supplier.id); const supplierCompliant = supplierRecords.filter((record) => record.compliant).length; const supplierOpenActions = openActions.filter((action) => action.supplier_id === supplier.id); const supplierOverdueActions = overdueActions.filter((action) => action.supplier_id === supplier.id); return <tr key={supplier.id} className="border-t"><td className="p-4"><p className="font-semibold">{supplier.legal_name}</p><p className="text-xs text-slate-500">{supplier.criticality}{supplier.strategic ? " · Estratégico" : ""}</p></td><td className="p-4">{supplierRecords.length ? `${((supplierCompliant / supplierRecords.length) * 100).toFixed(1)}%` : "Sem medição"}</td><td className="p-4">{supplierRecords.length - supplierCompliant}</td><td className="p-4">{supplierOpenActions.length}</td><td className={`p-4 font-semibold ${supplierOverdueActions.length ? "text-rose-700" : "text-slate-700"}`}>{supplierOverdueActions.length}</td></tr>; })}{!(suppliers ?? []).length ? <tr><td colSpan={5} className="p-5 text-slate-500">Nenhum fornecedor ativo disponível.</td></tr> : null}</tbody></table></div></section></main>;
}
