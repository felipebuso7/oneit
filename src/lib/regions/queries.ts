import { requireUser } from "@/lib/auth/current-user";
import { listAvailableOrganizations } from "@/lib/organizations/queries";

export async function listAvailableRegions() {
  const [{ supabase }, organizations] = await Promise.all([requireUser(), listAvailableOrganizations()]);
  const organizationIds = organizations.map((organization) => organization.id);
  if (!organizationIds.length) return [];

  const { data } = await supabase
    .from("regions")
    .select("id, organization_id, name, state_code")
    .in("organization_id", organizationIds)
    .eq("active", true)
    .order("name");
  return data ?? [];
}
