import { listAvailableOrganizations } from "@/lib/organizations/queries";
import { requireUser } from "@/lib/auth/current-user";

export async function listAvailableCustomers() {
  const [{ supabase }, organizations] = await Promise.all([requireUser(), listAvailableOrganizations()]);
  const organizationIds = organizations.map((organization) => organization.id);

  if (!organizationIds.length) return [];

  const { data } = await supabase
    .from("customers")
    .select("id, organization_id, name")
    .in("organization_id", organizationIds)
    .eq("active", true)
    .order("name");

  return data ?? [];
}
