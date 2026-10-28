import { requireUser } from "@/lib/auth/current-user";
import { OneitPageHeader } from "@/components/oneit";
import { MeasurementPanel } from "./measurement-panel";

export default async function FieldServiceFinancePage() {
  const { supabase, user } = await requireUser();
  const { data: roles, error: roleError } = await supabase.from("user_roles").select("organization_id").eq("user_id", user.id).in("role", ["SUPER_ADMIN", "ORG_ADMIN", "MANAGER", "FINANCE"]);
  if (roleError) throw new Error("Não foi possível validar o acesso ao Financeiro.");
  const organizationIds = [...new Set((roles ?? []).map((role) => role.organization_id))];
  const { data: organizations, error: organizationsError } = organizationIds.length
    ? await supabase.from("organizations").select("id,display_name").in("id", organizationIds).order("display_name")
    : { data: [], error: null };
  if (organizationsError) throw new Error("Não foi possível carregar as organizações autorizadas.");
  const { data: sheets, error: sheetsError } = organizationIds.length
    ? await supabase.from("measurement_sheets").select("id,organization_id,sheet_number,total_orders,total_amount,created_at,billing_period_id").in("organization_id", organizationIds).order("created_at", { ascending: false }).limit(100)
    : { data: [], error: null };
  if (sheetsError) throw new Error("Não foi possível carregar os boletins de medição.");
  const now = new Date();
  const defaultCompetence = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return <section className="mx-auto max-w-7xl p-5 sm:p-8"><OneitPageHeader eyebrow="Financeiro" title="Boletim de medição" description="Feche a competência com os serviços de Field Service aprovados e acompanhe o BM antes do envio ao cliente." /><MeasurementPanel organizations={organizations ?? []} initialSheets={sheets ?? []} defaultCompetence={defaultCompetence} /></section>;
}
