import Link from "next/link";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth/current-user";
import { updateAsset } from "../actions";

type PageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ message?: string }> };

export default async function AssetDetailPage({ params, searchParams }: PageProps) {
  const [{ id }, { message }, { supabase }] = await Promise.all([params, searchParams, requireUser()]);
  const { data: asset } = await supabase.from("assets").select("id,organization_id,asset_type_id,department_unit_id,asset_code,status,identifier,serial_number,patrimony_number,manufacturer,model,notes,created_at,updated_at").eq("id", id).maybeSingle();
  if (!asset) notFound();

  const [{ data: types }, { data: departments }, { data: history }, { data: ticketAssets }] = await Promise.all([
    supabase.from("asset_types").select("id,name").eq("organization_id", asset.organization_id).eq("active", true).order("name"),
    supabase.from("organization_units").select("id,name").eq("organization_id", asset.organization_id).eq("unit_type", "DEPARTMENT").eq("active", true).order("name"),
    supabase.from("asset_history").select("id,event_type,created_at,before_value,after_value").eq("asset_id", asset.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("ticket_assets").select("ticket_id,relationship_type,notes,created_at").eq("asset_id", asset.id).order("created_at", { ascending: false }),
  ]);
  const ticketIds = (ticketAssets ?? []).map((item) => item.ticket_id);
  const { data: tickets } = ticketIds.length ? await supabase.from("tickets").select("id,ticket_number,title,operational_status").in("id", ticketIds) : { data: [] };
  const ticketById = new Map((tickets ?? []).map((item) => [item.id, item]));

  return <main className="mx-auto max-w-6xl p-5 sm:p-8">
    <Link href="/portal/assets" className="text-sm font-medium text-[#0b4a64]">← Voltar para ativos</Link>
    <header className="mt-5"><p className="text-sm font-semibold tracking-[.15em] text-orange-500">DETALHE DO ATIVO</p><h1 className="mt-2 text-3xl font-semibold">{asset.asset_code}</h1><p className="mt-2 text-sm text-slate-600">Atualizado em {new Date(asset.updated_at).toLocaleString("pt-BR")}. Cada alteração gera um evento no histórico.</p></header>
    {message ? <p role="status" className="mt-4 rounded-lg bg-sky-50 p-3 text-sm text-sky-900">{message}</p> : null}
    <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_350px]">
      <form action={updateAsset} className="grid gap-4 rounded-xl border bg-white p-5 shadow-sm sm:grid-cols-2"><input type="hidden" name="assetId" value={asset.id} /><div className="sm:col-span-2"><h2 className="font-semibold">Dados principais</h2><p className="mt-1 text-sm text-slate-500">A organização do ativo é preservada; tipo e departamento são validados na mesma organização.</p></div><Field label="Código do ativo" name="assetCode" value={asset.asset_code} required /><label className="block text-sm font-medium">Status<select name="status" defaultValue={asset.status} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white p-2.5"><option value="ACTIVE">Ativo</option><option value="IN_STOCK">Em estoque</option><option value="MAINTENANCE">Em manutenção</option><option value="LOST">Extraviado</option><option value="RETIRED">Baixado</option></select></label><label className="block text-sm font-medium">Tipo de ativo<select name="assetTypeId" defaultValue={asset.asset_type_id} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white p-2.5">{(types ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="block text-sm font-medium">Departamento<select name="departmentUnitId" defaultValue={asset.department_unit_id ?? ""} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white p-2.5"><option value="">Sem departamento</option>{(departments ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><Field label="Identificador / responsável" name="identifier" value={asset.identifier ?? ""} /><Field label="Serial" name="serialNumber" value={asset.serial_number ?? ""} /><Field label="Patrimônio" name="patrimonyNumber" value={asset.patrimony_number ?? ""} /><Field label="Fabricante" name="manufacturer" value={asset.manufacturer ?? ""} /><Field label="Modelo" name="model" value={asset.model ?? ""} /><label className="block text-sm font-medium sm:col-span-2">Comentários<textarea name="notes" defaultValue={asset.notes ?? ""} rows={7} className="mt-1.5 w-full rounded-lg border border-slate-300 p-2.5" /></label><div className="sm:col-span-2"><button className="rounded-lg bg-[#092f40] px-4 py-2.5 text-sm font-semibold text-white">Salvar alterações</button></div></form>
      <aside className="space-y-5"><section className="rounded-xl border bg-white shadow-sm"><div className="border-b p-5"><h2 className="font-semibold">Histórico</h2><p className="mt-1 text-sm text-slate-500">Registro automático de criação e mudanças.</p></div><ol className="divide-y">{(history ?? []).map((event) => <li key={event.id} className="p-4"><p className="text-sm font-semibold">{historyLabel(event.event_type)}</p><p className="mt-1 text-xs text-slate-500">{new Date(event.created_at).toLocaleString("pt-BR")}</p></li>)}{!(history ?? []).length ? <li className="p-4 text-sm text-slate-500">Nenhum evento disponível.</li> : null}</ol></section><section className="rounded-xl border bg-white shadow-sm"><div className="border-b p-5"><h2 className="font-semibold">Chamados relacionados</h2><p className="mt-1 text-sm text-slate-500">Ocorrências em que este ativo foi vinculado.</p></div><ul className="divide-y">{(ticketAssets ?? []).map((item) => { const ticket = ticketById.get(item.ticket_id); return <li key={`${item.ticket_id}-${item.created_at}`} className="p-4"><Link href={`/portal/tickets/${item.ticket_id}`} className="text-sm font-semibold text-[#0b4a64] hover:underline">{ticket?.ticket_number ?? item.ticket_id.slice(0, 8)}</Link><p className="mt-1 text-sm text-slate-600">{ticket?.title ?? "Chamado não disponível"}</p><p className="mt-1 text-xs text-slate-500">{relationshipLabel(item.relationship_type)} · {ticket?.operational_status ?? "—"}</p>{item.notes ? <p className="mt-2 text-xs text-slate-500">{item.notes}</p> : null}</li>; })}{!(ticketAssets ?? []).length ? <li className="p-4 text-sm text-slate-500">Nenhum chamado relacionado.</li> : null}</ul></section></aside>
    </section>
  </main>;
}

function Field({ label, name, value, required = false }: { label: string; name: string; value: string; required?: boolean }) {
  return <label className="block text-sm font-medium">{label}<input name={name} defaultValue={value} required={required} className="mt-1.5 w-full rounded-lg border border-slate-300 p-2.5" /></label>;
}

function historyLabel(eventType: string) {
  return ({ CREATED: "Ativo cadastrado", UPDATED: "Dados atualizados", ASSIGNED: "Responsável atribuído", UNASSIGNED: "Responsável removido", INVENTORIED: "Inventariado", STATUS_CHANGED: "Status alterado" }[eventType] ?? eventType);
}

function relationshipLabel(value: string) {
  return ({ AFFECTED: "Ativo afetado", RELATED: "Ativo relacionado", REPLACEMENT: "Ativo de substituição" }[value] ?? value);
}
