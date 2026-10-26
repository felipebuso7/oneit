import { requireUser } from "@/lib/auth/current-user";
import { listAvailableOrganizations } from "@/lib/organizations/queries";
import { listAvailableRegions } from "@/lib/regions/queries";
import { createTechnician } from "./actions";
import { OneitButton, OneitEmptyState, OneitPageHeader, OneitStatusBadge } from "@/components/oneit";

type PageProps = { searchParams: Promise<{ message?: string }> };
export default async function TechniciansPage({ searchParams }: PageProps) {
  const [{ supabase }, organizations, regions, { message }] = await Promise.all([requireUser(), listAvailableOrganizations(), listAvailableRegions(), searchParams]);
  const ids = organizations.map((item) => item.id);
  const { data: technicians } = ids.length ? await supabase.from("technicians").select("id, full_name, email, base_city, status, primary_region_id").in("organization_id", ids).order("full_name") : { data: [] };
  return <section className="mx-auto max-w-5xl p-8"><OneitPageHeader eyebrow="Cadastros" title="Técnicos" description="Equipe própria e parceira disponível para os atendimentos de campo." />{message ? <p className="mt-4 rounded bg-sky-100 p-3 text-sm text-sky-900">{message}</p> : null}
    <form action={createTechnician} className="mt-6 grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-2"><select className="rounded border p-2" name="organizationId" required defaultValue=""><option disabled value="">Organização</option>{organizations.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}</select><input className="rounded border p-2" name="fullName" placeholder="Nome completo" required /><input className="rounded border p-2" name="email" placeholder="E-mail (opcional)" type="email" /><input className="rounded border p-2" name="phone" placeholder="Telefone (opcional)" /><input className="rounded border p-2" name="employmentType" placeholder="Vínculo: próprio, parceiro..." required /><input className="rounded border p-2" name="baseCity" placeholder="Cidade-base (opcional)" /><select className="rounded border p-2" name="primaryRegionId" defaultValue=""><option value="">Região principal (opcional)</option>{regions.map((item) => <option key={item.id} value={item.id}>{item.name}{item.state_code ? ` - ${item.state_code}` : ""}</option>)}</select><OneitButton type="submit">Cadastrar técnico</OneitButton></form>
    {technicians?.length ? <ul className="mt-6 divide-y rounded-xl border bg-white">{technicians.map((item) => <li className="flex items-center justify-between gap-3 p-4" key={item.id}><div><strong>{item.full_name}</strong><p className="text-sm text-slate-500">{item.base_city ?? "Sem cidade-base"}</p></div><OneitStatusBadge tone={item.status === "ACTIVE" ? "success" : "neutral"}>{item.status}</OneitStatusBadge></li>)}</ul> : <div className="mt-6"><OneitEmptyState title="Nenhum técnico cadastrado" description="Cadastre um técnico para disponibilizar atendimentos de campo." /></div>}</section>;
}
