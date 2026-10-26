import { z } from "zod";
import { withPostgresActor } from "@/lib/database/postgres";
import { getSelfHostedCurrentUser } from "@/lib/auth/self-hosted-current-user";
import { hasSameOrigin } from "@/lib/http/same-origin";
import { readLimitedBody } from "@/lib/http/limited-body";
import { canAdministerSgstiOrganization } from "@/lib/sgsti/access";
import { userAccessCommandSchema } from "@/lib/validation/access-control";

const identifierSchema = z.uuid();
const querySchema = z.object({ organizationId: z.uuid() });

function reply(status: number, code: string) {
  return Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });
}

function selfHostedRequired() {
  return process.env.ONEIT_DEPLOYMENT_MODE === "self_hosted";
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!selfHostedRequired()) return reply(409, "SELF_HOSTED_MODE_REQUIRED");
  const userId = identifierSchema.safeParse((await params).id);
  const organization = querySchema.safeParse({ organizationId: new URL(request.url).searchParams.get("organizationId") });
  if (!userId.success || !organization.success) return reply(400, "INVALID_USER_QUERY");
  const actor = await getSelfHostedCurrentUser();
  if (!actor) return reply(401, "AUTH_REQUIRED");

  try {
    const result = await withPostgresActor({ userId: actor.id }, async (client) => {
      if (!await canAdministerSgstiOrganization(client, organization.data.organizationId)) return null;
      const [profile, technician, roles, modules, permissions, history] = await Promise.all([
        client.query<{ id: string; full_name: string; email: string; active: boolean }>(
          "select id, full_name, email, active from public.user_profiles where id = $1",
          [userId.data],
        ),
        client.query<{
          id: string; full_name: string; email: string | null; phone: string | null; mobile: string | null;
          employee_identifier: string | null; job_title: string | null; employment_type: string;
          hourly_cost: string | null; visibility_scope: string; external_partner_reference: string | null; active: boolean;
        }>(
          `select id, full_name, email, phone, mobile, employee_identifier, job_title, employment_type,
                  hourly_cost, visibility_scope, external_partner_reference, active
             from public.technicians where organization_id = $1 and user_id = $2`,
          [organization.data.organizationId, userId.data],
        ),
        client.query<{ role: string }>("select role from public.user_roles where organization_id = $1 and user_id = $2 order by role", [organization.data.organizationId, userId.data]),
        client.query<{ module_key: string; enabled: boolean; visibility_scope: string }>(
          "select module_key, enabled, visibility_scope from public.user_module_access where organization_id = $1 and user_id = $2 order by module_key",
          [organization.data.organizationId, userId.data],
        ),
        client.query<{ permission_key: string; enabled: boolean }>(
          "select permission_key, enabled from public.user_permission_grants where organization_id = $1 and user_id = $2 order by permission_key",
          [organization.data.organizationId, userId.data],
        ),
        client.query<{ action: string; after_value: Record<string, unknown> | null; created_at: string; actor_name: string | null }>(
          `select log.action, log.after_value, log.created_at, profile.full_name as actor_name
             from public.audit_logs log left join public.user_profiles profile on profile.id = log.actor_id
            where log.organization_id = $1 and log.entity_type = 'user_profile' and log.entity_id = $2
            order by log.created_at desc limit 100`,
          [organization.data.organizationId, userId.data],
        ),
      ]);
      if (!profile.rows[0]) return false;
      return {
        profile: profile.rows[0], technician: technician.rows[0] ?? null, roles: roles.rows,
        modules: modules.rows, permissions: permissions.rows, history: history.rows,
      };
    });
    if (result === null) return reply(403, "ADMINISTRATION_ACCESS_DENIED");
    if (result === false) return reply(404, "USER_NOT_FOUND");
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return reply(503, "ADMINISTRATION_UNAVAILABLE");
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!selfHostedRequired()) return reply(409, "SELF_HOSTED_MODE_REQUIRED");
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED");
  const userId = identifierSchema.safeParse((await params).id);
  if (!userId.success) return reply(400, "INVALID_USER");
  const raw = await readLimitedBody(request, 32 * 1024);
  if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE");
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const command = userAccessCommandSchema.safeParse(input);
  if (!command.success) return reply(400, "INVALID_ACCESS_COMMAND");
  const targetUserId = command.data.kind === "COPY" ? command.data.value.targetUserId : command.data.value.userId;
  if (targetUserId !== userId.data) return reply(400, "INVALID_ACCESS_COMMAND");
  const actor = await getSelfHostedCurrentUser();
  if (!actor) return reply(401, "AUTH_REQUIRED");

  const organizationId = command.data.value.organizationId;
  try {
    const allowed = await withPostgresActor({ userId: actor.id }, async (client) => {
      if (!await canAdministerSgstiOrganization(client, organizationId)) return false;
      if (command.data.kind === "MODULE") {
        const value = command.data.value;
        await client.query("select public.set_user_module_access($1,$2,$3,$4,$5::public.user_visibility_scope)", [value.organizationId, value.userId, value.moduleKey, value.enabled, value.visibilityScope]);
      } else if (command.data.kind === "PERMISSION") {
        const value = command.data.value;
        await client.query("select public.set_user_permission_grant($1,$2,$3,$4)", [value.organizationId, value.userId, value.permissionKey, value.enabled]);
      } else {
        const value = command.data.value;
        await client.query("select public.copy_user_access_profile($1,$2,$3)", [value.organizationId, value.sourceUserId, value.targetUserId]);
      }
      return true;
    });
    if (!allowed) return reply(403, "ADMINISTRATION_ACCESS_DENIED");
    return Response.json({ userId: userId.data, updated: command.data.kind }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return reply(503, "ADMINISTRATION_UNAVAILABLE");
  }
}
