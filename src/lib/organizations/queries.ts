import { requireUser } from "@/lib/auth/current-user";

export async function listAvailableOrganizations() {
  const { supabase, user } = await requireUser();
  const { data: memberships, error: membershipError } = await supabase
    .from("user_roles")
    .select("organization_id, role")
    .eq("user_id", user.id);

  if (membershipError || !memberships?.length) {
    return [];
  }

  const organizationIds = memberships.map((membership) => membership.organization_id);
  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, legal_name, display_name")
    .in("id", organizationIds)
    .order("display_name");

  return organizations ?? [];
}
