import { requireUser } from "@/lib/auth/current-user";
import { listAvailableOrganizations } from "@/lib/organizations/queries";

async function organizationIds() {
  const organizations = await listAvailableOrganizations();
  return organizations.map((organization) => organization.id);
}

export async function listFieldServiceCompanies() {
  const [{ supabase }, ids] = await Promise.all([requireUser(), organizationIds()]);
  if (!ids.length) return [];
  const { data } = await supabase.from("field_service_companies").select("id,organization_id,legal_name,trade_name,cnpj,active").in("organization_id", ids).eq("active", true).order("legal_name");
  return data ?? [];
}

export async function listFieldServicePolos(companyId?: string) {
  const [{ supabase }, ids] = await Promise.all([requireUser(), organizationIds()]);
  if (!ids.length) return [];
  let query = supabase.from("field_service_polos").select("id,organization_id,company_id,name,address,city,state,region,distance_capital_km,latitude,longitude,active").in("organization_id", ids).eq("active", true).order("name");
  if (companyId) query = query.eq("company_id", companyId);
  const { data } = await query;
  return data ?? [];
}

export async function listActiveFieldServiceLpu() {
  const [{ supabase }, ids] = await Promise.all([requireUser(), organizationIds()]);
  if (!ids.length) return [];
  const { data } = await supabase.from("field_service_lpu_items").select("id,organization_id,code,description,kind,unit,unit_price,valid_from,valid_until,active").in("organization_id", ids).eq("active", true).order("code");
  return data ?? [];
}

export async function listActiveFieldServiceTechnicians() {
  const [{ supabase }, ids] = await Promise.all([requireUser(), organizationIds()]);
  if (!ids.length) return [];
  const { data } = await supabase.from("field_service_technicians").select("id,organization_id,name,email,technician_type,phone,mobile,job_title,hourly_cost,base_address,active").in("organization_id", ids).eq("active", true).order("name");
  return data ?? [];
}
