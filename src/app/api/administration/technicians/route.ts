import { withPostgresActor } from "@/lib/database/postgres";
import { getSelfHostedCurrentUser } from "@/lib/auth/self-hosted-current-user";
import { hasSameOrigin } from "@/lib/http/same-origin";
import { readLimitedBody } from "@/lib/http/limited-body";
import { canAdministerSgstiOrganization } from "@/lib/sgsti/access";
import { technicianProfileSchema } from "@/lib/validation/access-control";

function reply(status: number, code: string) {
  return Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (process.env.ONEIT_DEPLOYMENT_MODE !== "self_hosted") return reply(409, "SELF_HOSTED_MODE_REQUIRED");
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED");
  const raw = await readLimitedBody(request, 32 * 1024);
  if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE");
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = technicianProfileSchema.safeParse(input);
  if (!parsed.success) return reply(400, "INVALID_TECHNICIAN");
  const actor = await getSelfHostedCurrentUser();
  if (!actor) return reply(401, "AUTH_REQUIRED");

  try {
    const technicianId = await withPostgresActor({ userId: actor.id }, async (client) => {
      const value = parsed.data;
      if (!await canAdministerSgstiOrganization(client, value.organizationId)) return null;
      if (value.userId) {
        const membership = await client.query("select 1 from public.user_roles where organization_id = $1 and user_id = $2", [value.organizationId, value.userId]);
        if (!membership.rows[0]) return false;
      }
      const created = await client.query<{ id: string }>(
        `insert into public.technicians (
           organization_id, user_id, full_name, email, phone, mobile, employee_identifier,
           job_title, employment_type, hourly_cost, visibility_scope, external_partner_reference, active, status
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'AVAILABLE') returning id`,
        [
          value.organizationId, value.userId ?? null, value.fullName, value.email ?? null, value.phone ?? null,
          value.mobile ?? null, value.employeeIdentifier ?? null, value.jobTitle ?? null,
          value.employmentType, value.hourlyCost ?? null, value.visibilityScope,
          value.externalPartnerReference ?? null, value.active,
        ],
      );
      const technician = created.rows[0];
      await client.query(
        `insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, after_value, source)
         values ($1,$2,'TECHNICIAN_CREATED','technician',$3,jsonb_build_object('employment_type',$4,'active',$5),'WEB')`,
        [value.organizationId, actor.id, technician?.id, value.employmentType, value.active],
      );
      return technician?.id ?? null;
    });
    if (technicianId === null) return reply(403, "ADMINISTRATION_ACCESS_DENIED");
    if (technicianId === false) return reply(422, "TECHNICIAN_USER_MUST_BE_ORGANIZATION_MEMBER");
    return Response.json({ technicianId }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return reply(503, "ADMINISTRATION_UNAVAILABLE");
  }
}
