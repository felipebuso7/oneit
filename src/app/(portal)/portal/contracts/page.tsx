import { requireUser } from "@/lib/auth/current-user";
import { listAvailableCustomers } from "@/lib/customers/queries";
import { listAvailableOrganizations } from "@/lib/organizations/queries";

import { createContract, updateContract, archiveContract } from "./actions";
import { OneitPageHeader } from "@/components/oneit";

type PageProps = { searchParams: Promise<{ message?: string }> };

export default async function ContractsPage({ searchParams }: PageProps) {
  const [{ supabase }, organizations, customers, { message }] = await Promise.all([requireUser(), listAvailableOrganizations(), listAvailableCustomers(), searchParams]);
  const organizationIds = organizations.map((organization) => organization.id);
  const [contractsResult, alertsResult] = await Promise.all([
    organizationIds.length ? supabase.from("contracts").select("id, organization_id, customer_id, code, name, starts_at, ends_at, customer_owner_name, service_hours, scope_summary, exclusions_summary, renewal_automatic, renewal_notice_days, active").in("organization_id", organizationIds).order("starts_at", { ascending: false }) : Promise.resolve({ data: [] }),
    organizationIds.length ? supabase.rpc("contract_expiry_alerts", { target_days: 60 }) : Promise.resolve({ data: [] }),
  ]);
  const contracts = contractsResult.data;
  const expiryAlerts = (alertsResult.data ?? []) as Array<{ contract_id: string; days_remaining: number }>;
  const expiryDays = new Map(expiryAlerts.map((alert) => [alert.contract_id, alert.days_remaining]));

  return <section className="oneit-page-shell mx-auto max-w-5xl p-5 sm:p-8">
    <OneitPageHeader eyebrow="Cadastros" title="Contratos" description="Centralize vigência, escopo e regras de atendimento por cliente." />
    {message ? <p className="mt-4 rounded bg-sky-100 p-3 text-sm text-sky-900">{message}</p> : null}
    <form action={createContract} className="oneit-card mt-6 grid gap-3 p-5 sm:grid-cols-2">
      <select className="rounded border p-2" name="organizationId" required defaultValue=""><option disabled value="">Organização</option>{organizations.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}</select>
      <select className="rounded border p-2" name="customerId" required defaultValue=""><option disabled value="">Cliente</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <input className="rounded border p-2" name="code" placeholder="Código do contrato" required /><input className="rounded border p-2" name="name" placeholder="Nome do contrato" required />
      <input className="rounded border p-2" name="startsAt" type="date" required /><input className="rounded border p-2" name="endsAt" type="date" />
      <input className="rounded border p-2" name="customerOwnerName" placeholder="Responsável do cliente" /><input className="rounded border p-2" name="serviceHours" placeholder="Horário de atendimento" />
      <textarea className="rounded border p-2 sm:col-span-2" name="scopeSummary" placeholder="Escopo do contrato" /><textarea className="rounded border p-2 sm:col-span-2" name="exclusionsSummary" placeholder="Exclusões" />
      <input className="rounded border p-2" name="renewalNoticeDays" type="number" min="1" max="730" placeholder="Aviso prévio (dias)" /><label className="flex items-center gap-2 text-sm"><input name="renewalAutomatic" value="true" type="checkbox" /> Renovação automática</label>
      <button className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="submit">Cadastrar contrato</button>
    </form>
    <ul className="oneit-card mt-6 divide-y overflow-hidden">{(contracts ?? []).map((item) => <li className="p-4" key={item.id}><div><strong>{item.code}</strong> — {item.name}<span className="ml-2 text-sm text-slate-500">{item.starts_at} a {item.ends_at ?? "vigente"}</span>{!item.active ? <span className="ml-2 rounded bg-slate-200 px-2 py-1 text-xs text-slate-700">Inativado</span> : expiryDays.has(item.id) ? <span className="ml-2 rounded bg-amber-100 px-2 py-1 text-xs text-amber-900">Vence em {expiryDays.get(item.id)} dias</span> : null}</div>{item.active ? <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-sky-900">Editar contrato</summary><form action={updateContract} className="mt-3 grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-2"><input type="hidden" name="contractId" value={item.id} /><input type="hidden" name="organizationId" value={item.organization_id} /><input type="hidden" name="customerId" value={item.customer_id} /><input name="code" defaultValue={item.code} required className="rounded border p-2" /><input name="name" defaultValue={item.name} required className="rounded border p-2" /><input name="startsAt" type="date" defaultValue={item.starts_at} required className="rounded border p-2" /><input name="endsAt" type="date" defaultValue={item.ends_at ?? ""} className="rounded border p-2" /><input name="customerOwnerName" defaultValue={item.customer_owner_name ?? ""} placeholder="Responsável do cliente" className="rounded border p-2" /><input name="serviceHours" defaultValue={item.service_hours ?? ""} placeholder="Horário de atendimento" className="rounded border p-2" /><textarea name="scopeSummary" defaultValue={item.scope_summary ?? ""} placeholder="Escopo" className="rounded border p-2 sm:col-span-2" /><textarea name="exclusionsSummary" defaultValue={item.exclusions_summary ?? ""} placeholder="Exclusões" className="rounded border p-2 sm:col-span-2" /><input name="renewalNoticeDays" type="number" min="1" max="730" defaultValue={item.renewal_notice_days ?? ""} placeholder="Aviso prévio" className="rounded border p-2" /><label className="flex items-center gap-2 text-sm"><input name="renewalAutomatic" value="true" type="checkbox" defaultChecked={item.renewal_automatic} /> Renovação automática</label><button className="rounded bg-sky-950 px-3 py-2 text-sm font-semibold text-white" type="submit">Salvar alterações</button></form><form action={archiveContract} className="mt-2"><input type="hidden" name="contractId" value={item.id} /><button className="text-sm font-semibold text-rose-700" type="submit">Inativar contrato</button></form></details> : null}</li>)}</ul>
  </section>;
}
