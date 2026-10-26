import type { PoolClient } from "pg";

const administrationRoles = "array['SUPER_ADMIN','ORG_ADMIN']::public.platform_role[]";

export async function canReadSgstiOrganization(client: PoolClient, organizationId: string) {
  const result = await client.query<{ allowed: boolean }>(
    "select public.is_organization_member($1) as allowed",
    [organizationId],
  );
  return result.rows[0]?.allowed === true;
}

export async function canManageSgstiOrganization(client: PoolClient, organizationId: string) {
  const result = await client.query<{ allowed: boolean }>(
    "select public.has_sgsti_management_access($1) as allowed",
    [organizationId],
  );
  return result.rows[0]?.allowed === true;
}

export async function canAdministerSgstiOrganization(client: PoolClient, organizationId: string) {
  const result = await client.query<{ allowed: boolean }>(
    `select public.has_organization_role($1, ${administrationRoles}) as allowed`,
    [organizationId],
  );
  return result.rows[0]?.allowed === true;
}
