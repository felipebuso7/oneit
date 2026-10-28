import { requireUser } from "@/lib/auth/current-user";
import { listAvailableOrganizations } from "@/lib/organizations/queries";
import { OneitPageHeader } from "@/components/oneit";
import { LpuSettingsClient } from "./lpu-settings-client";
import { LpuCompositionsClient } from "./lpu-compositions-client";

export default async function LpuSettingsPage() {
  const [{ supabase }, organizations] = await Promise.all([requireUser(), listAvailableOrganizations()]);
  const organizationIds = organizations.map((organization) => organization.id);
  const { data: items } = organizationIds.length
    ? await supabase
      .from("field_service_lpu_items")
      .select("id,organization_id,code,description,kind,unit,unit_price,valid_from,valid_until,active")
      .in("organization_id", organizationIds)
      .order("code")
    : { data: [] };

  return <section className="mx-auto max-w-6xl p-8">
    <OneitPageHeader eyebrow="Configurações · Field Service" title="Cadastro de LPU" description="Cadastre materiais, mão de obra e deslocamentos com unidade e preço unitário para a validação e o faturamento." />
    <LpuSettingsClient organizations={organizations} initialItems={items ?? []} />
    <LpuCompositionsClient organizations={organizations} items={items ?? []} />
  </section>;
}
