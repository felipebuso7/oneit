import { requireUser } from "@/lib/auth/current-user";
import { createServiceCategory, createServiceOffering, createServiceSubcategory, updateServiceCatalogItem } from "./actions";

type PageProps = { searchParams: Promise<{ message?: string }> };
type CatalogItem = { id: string; code: string; name: string; active: boolean };

function CatalogItemEditor({ item, kind, label }: { item: CatalogItem; kind: "category" | "subcategory" | "offering"; label: string }) {
  return <form action={updateServiceCatalogItem} className="flex flex-wrap items-center gap-2 rounded-lg border bg-white p-2.5 shadow-sm">
    <input type="hidden" name="id" value={item.id} /><input type="hidden" name="kind" value={kind} /><input type="hidden" name="active" value={String(item.active)} />
    <span className="w-24 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
    <input aria-label={`Código ${label}`} name="code" defaultValue={item.code} required className="w-28 rounded border p-1.5 font-mono text-xs" />
    <input aria-label={`Nome ${label}`} name="name" defaultValue={item.name} required className="min-w-48 flex-1 rounded border p-1.5 text-sm" />
    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{item.active ? "Ativo" : "Inativo"}</span>
    <button className="text-sm font-semibold text-[#0b4a64]">Salvar</button>
  </form>;
}

function CatalogToggle({ item, kind }: { item: CatalogItem; kind: "category" | "subcategory" | "offering" }) {
  return <form action={updateServiceCatalogItem} className="inline">
    <input type="hidden" name="id" value={item.id} /><input type="hidden" name="kind" value={kind} /><input type="hidden" name="code" value={item.code} /><input type="hidden" name="name" value={item.name} /><input type="hidden" name="active" value={item.active ? "false" : "true"} />
    <button className="mt-1 text-xs font-medium text-slate-600 underline underline-offset-2">{item.active ? "Inativar" : "Reativar"}</button>
  </form>;
}

export default async function ServiceCatalogPage({ searchParams }: PageProps) {
  const [{ supabase, user }, { message }] = await Promise.all([requireUser(), searchParams]);
  const { data: roles } = await supabase.from("user_roles").select("organization_id").eq("user_id", user.id).in("role", ["ORG_ADMIN", "SUPER_ADMIN"]);
  const ids = [...new Set((roles ?? []).map((role) => role.organization_id))];
  if (!ids.length) return <section className="p-8"><h1 className="text-2xl font-semibold">Catálogo de serviços</h1><p className="mt-3">Somente administradores organizacionais mantêm o catálogo.</p></section>;

  const [{ data: organizations }, { data: categories }] = await Promise.all([
    supabase.from("organizations").select("id, display_name").in("id", ids).eq("active", true).order("display_name"),
    supabase.from("service_categories").select("id, organization_id, code, name, active").in("organization_id", ids).order("name"),
  ]);
  const categoryIds = (categories ?? []).map((item) => item.id);
  const { data: subcategories } = categoryIds.length
    ? await supabase.from("service_subcategories").select("id, category_id, code, name, active").in("category_id", categoryIds).order("name")
    : { data: [] };
  const subcategoryIds = (subcategories ?? []).map((item) => item.id);
  const { data: offerings } = subcategoryIds.length
    ? await supabase.from("service_offerings").select("id, subcategory_id, code, name, active").in("subcategory_id", subcategoryIds).order("name")
    : { data: [] };
  const activeCategories = (categories ?? []).filter((item) => item.active);
  const activeSubcategories = (subcategories ?? []).filter((item) => item.active && activeCategories.some((category) => category.id === item.category_id));

  return <section className="mx-auto max-w-6xl p-5 sm:p-8">
    <p className="text-sm font-semibold tracking-[0.15em] text-cyan-700">ITSM · CATÁLOGO</p><h1 className="mt-2 text-3xl font-semibold">Catálogo de serviços</h1>
    <p className="mt-2 max-w-3xl text-sm text-slate-600">Categorias → subcategorias → ofertas. O catálogo controla a classificação disponível no chamado e a associação das políticas de SLA/OLA.</p>
    {message ? <p role="status" className="mt-4 rounded bg-sky-100 p-3 text-sm">{message}</p> : null}
    <div className="mt-6 grid gap-4 lg:grid-cols-3">
      <form action={createServiceCategory} className="space-y-3 rounded-xl border bg-white p-4"><h2 className="font-semibold">Categoria</h2><select name="organizationId" required defaultValue="" className="w-full rounded border p-2"><option disabled value="">Organização</option>{(organizations ?? []).map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}</select><input name="code" required placeholder="Código, ex.: NETWORK" className="w-full rounded border p-2" /><input name="name" required placeholder="Nome" className="w-full rounded border p-2" /><button className="rounded bg-slate-900 px-3 py-2 text-white">Adicionar</button></form>
      <form action={createServiceSubcategory} className="space-y-3 rounded-xl border bg-white p-4"><h2 className="font-semibold">Subcategoria</h2><select name="parentId" required defaultValue="" className="w-full rounded border p-2"><option disabled value="">Categoria</option>{activeCategories.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</select><input name="code" required placeholder="Código" className="w-full rounded border p-2" /><input name="name" required placeholder="Nome" className="w-full rounded border p-2" /><button className="rounded bg-slate-900 px-3 py-2 text-white">Adicionar</button></form>
      <form action={createServiceOffering} className="space-y-3 rounded-xl border bg-white p-4"><h2 className="font-semibold">Oferta de serviço</h2><select name="parentId" required defaultValue="" className="w-full rounded border p-2"><option disabled value="">Subcategoria</option>{activeSubcategories.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</select><input name="code" required placeholder="Código" className="w-full rounded border p-2" /><input name="name" required placeholder="Nome" className="w-full rounded border p-2" /><button className="rounded bg-slate-900 px-3 py-2 text-white">Adicionar</button></form>
    </div>
    <section className="mt-6 space-y-4 rounded-xl border bg-slate-50 p-5"><div><h2 className="font-semibold">Estrutura e manutenção</h2><p className="mt-1 text-sm text-slate-600">Edite código e nome. Para retirar um item da abertura de chamados, use <strong>Inativar</strong>; a exclusão física não é permitida para preservar o histórico. Para inativar um nível, primeiro inative seus itens filhos.</p></div>{(categories ?? []).map((category) => <div key={category.id} className="space-y-2"><CatalogItemEditor item={category} kind="category" label="Categoria" /><CatalogToggle item={category} kind="category" />{(subcategories ?? []).filter((item) => item.category_id === category.id).map((subcategory) => <div key={subcategory.id} className="ml-4 space-y-2 border-l-2 border-slate-200 pl-3"><CatalogItemEditor item={subcategory} kind="subcategory" label="Subcategoria" /><CatalogToggle item={subcategory} kind="subcategory" />{(offerings ?? []).filter((item) => item.subcategory_id === subcategory.id).map((offering) => <div key={offering.id} className="ml-4 border-l-2 border-slate-200 pl-3"><CatalogItemEditor item={offering} kind="offering" label="Oferta" /><CatalogToggle item={offering} kind="offering" /></div>)}</div>)}</div>)}{!(categories ?? []).length ? <p className="text-sm text-slate-500">Nenhuma categoria cadastrada.</p> : null}</section>
  </section>;
}
