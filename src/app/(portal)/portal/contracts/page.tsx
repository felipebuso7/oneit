import { requireUser } from "@/lib/auth/current-user";
import { listAvailableCustomers } from "@/lib/customers/queries";
import { listAvailableOrganizations } from "@/lib/organizations/queries";

import { createContract } from "./actions";

type PageProps = { searchParams: Promise<{ message?: string }> };

export default async function ContractsPage({ searchParams }: PageProps) {
  const [{ supabase }, organizations, customers, { message }] = await Promise.all([requireUser(), listAvailableOrganizations(), listAvailableCustomers(), searchParams]);
  const organizationIds = organizations.map((organization) => organization.id);
  const [contractsResult, alertsResult] = await Promise.all([
    organizationIds.length ? supabase.from("contracts").select("id, code, name, starts_at, ends_at").in("organization_id", organizationIds).order("starts_at", { ascending: false }) : Promise.resolve({ data: [] }),
    organizationIds.length ? supabase.rpc("contract_expiry_alerts", { target_days: 60 }) : Promise.resolve({ data: [] }),
  ]);
  const contracts = contractsResult.data;
  const expiryAlerts = (alertsResult.data ?? []) as Array<{ contract_id: string; days_remaining: number }>;
  const expiryDays = new Map(expiryAlerts.map((alert) => [alert.contract_id, alert.days_remaining]));

  return <section className="mx-auto max-w-5xl p-8">
    <p className="text-sm font-semibold tracking-[0.15em] text-cyan-700">CADASTROS</p><h1 className="mt-2 text-3xl font-semibold">Contratos</h1>
    {message ? <p className="mt-4 rounded bg-sky-100 p-3 text-sm text-sky-900">{message}</p> : null}
    <form action={createContract} className="mt-6 grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-2">
      <select className="rounded border p-2" name="organizationId" required defaultValue=""><option disabled value="">Organização</option>{organizations.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}</select>
      <select className="rounded border p-2" name="customerId" required defaultValue=""><option disabled value="">Cliente</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <input className="rounded border p-2" name="code" placeholder="Código do contrato" required /><input className="rounded border p-2" name="name" placeholder="Nome do contrato" required />
      <input className="rounded border p-2" name="startsAt" type="date" required /><input className="rounded border p-2" name="endsAt" type="date" />
      <input className="rounded border p-2" name="customerOwnerName" placeholder="Responsável do cliente" /><input className="rounded border p-2" name="serviceHours" placeholder="Horário de atendimento" />
      <textarea className="rounded border p-2 sm:col-span-2" name="scopeSummary" placeholder="Escopo do contrato" /><textarea className="rounded border p-2 sm:col-span-2" name="exclusionsSummary" placeholder="Exclusões" />
      <input className="rounded border p-2" name="renewalNoticeDays" type="number" min="1" max="730" placeholder="Aviso prévio (dias)" /><label className="flex items-center gap-2 text-sm"><input name="renewalAutomatic" value="true" type="checkbox" /> Renovação automática</label>
      <button className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="submit">Cadastrar contrato</button>
    </form>
    <ul className="mt-6 divide-y rounded-xl border bg-white">{(contracts ?? []).map((item) => <li className="p-4" key={item.id}><strong>{item.code}</strong> — {item.name}<span className="ml-2 text-sm text-slate-500">{item.starts_at} a {item.ends_at ?? "vigente"}</span>{expiryDays.has(item.id) ? <span className="ml-2 rounded bg-amber-100 px-2 py-1 text-xs text-amber-900">Vence em {expiryDays.get(item.id)} dias</span> : null}</li>)}</ul>
  </section>;
}
