import { requireUser } from "@/lib/auth/current-user";
import { listAvailableOrganizations } from "@/lib/organizations/queries";
import { createRegion } from "./actions";
type PageProps = { searchParams: Promise<{ message?: string }> };
export default async function RegionsPage({ searchParams }: PageProps) {
  const [{ supabase }, organizations, { message }] = await Promise.all([requireUser(), listAvailableOrganizations(), searchParams]);
  const ids = organizations.map((item) => item.id);
  const { data: regions } = ids.length ? await supabase.from("regions").select("id, name, state_code").in("organization_id", ids).order("name") : { data: [] };
  return <section className="mx-auto max-w-4xl p-8"><p className="text-sm font-semibold tracking-[0.15em] text-cyan-700">CADASTROS</p><h1 className="mt-2 text-3xl font-semibold">Regiões</h1>{message ? <p className="mt-4 rounded bg-sky-100 p-3 text-sm text-sky-900">{message}</p> : null}
    <form action={createRegion} className="mt-6 flex flex-wrap gap-3 rounded-xl border bg-white p-5"><select className="rounded border p-2" name="organizationId" required defaultValue=""><option disabled value="">Organização</option>{organizations.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}</select><input className="rounded border p-2" name="name" placeholder="Nome da região" required /><input className="w-24 rounded border p-2" name="stateCode" placeholder="UF" maxLength={2} /><button className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="submit">Cadastrar</button></form>
    <ul className="mt-6 divide-y rounded-xl border bg-white">{(regions ?? []).map((item) => <li className="p-4" key={item.id}>{item.name} <span className="text-sm text-slate-500">{item.state_code ?? ""}</span></li>)}</ul></section>;
}
