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
    ? await supabase.from("measurement_sheets").select("id,organization_id,sheet_number,total_orders,total_amount,created_at,billing_period_id,billing_periods!inner(competence,status)").in("organization_id", organizationIds).order("created_at", { ascending: false }).limit(100)
    : { data: [], error: null };
  if (sheetsError) throw new Error("Não foi possível carregar os boletins de medição.");
  const sheetIds = (sheets ?? []).map((sheet) => sheet.id);
  const { data: blockedLines } = sheetIds.length
    ? await supabase.from("measurement_sheet_lines").select("measurement_sheet_id,ticket_id,tickets!inner(operational_status)").in("measurement_sheet_id", sheetIds).eq("tickets.operational_status", "CANCELLED")
    : { data: [] };
  const blockedSheetIds = new Set((blockedLines ?? []).map((line) => line.measurement_sheet_id));
  const now = new Date();
  const defaultCompetence = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const normalizedSheets = (sheets ?? []).filter((sheet) => !blockedSheetIds.has(sheet.id)).map((sheet) => { const period = Array.isArray(sheet.billing_periods) ? sheet.billing_periods[0] : sheet.billing_periods; return { ...sheet, competence: period?.competence ?? "", status: period?.status ?? "DRAFT" }; });
  return <section className="mx-auto max-w-7xl p-5 sm:p-8"><OneitPageHeader eyebrow="Financeiro" title="Boletim de medição" description="Feche a competência com os serviços de Field Service aprovados e acompanhe o BM antes do envio ao cliente." /><MeasurementPanel organizations={organizations ?? []} initialSheets={normalizedSheets} defaultCompetence={defaultCompetence} /></section>;
}
