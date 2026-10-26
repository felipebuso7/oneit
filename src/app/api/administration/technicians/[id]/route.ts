import { z } from "zod";
import { withPostgresActor } from "@/lib/database/postgres";
import { getSelfHostedCurrentUser } from "@/lib/auth/self-hosted-current-user";
import { hasSameOrigin } from "@/lib/http/same-origin";
import { readLimitedBody } from "@/lib/http/limited-body";
import { canAdministerSgstiOrganization } from "@/lib/sgsti/access";
import { technicianProfileSchema } from "@/lib/validation/access-control";

const identifierSchema = z.uuid();
function reply(status: number, code: string) { return Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } }); }

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.ONEIT_DEPLOYMENT_MODE !== "self_hosted") return reply(409, "SELF_HOSTED_MODE_REQUIRED");
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED");
  const technicianId = identifierSchema.safeParse((await params).id);
  if (!technicianId.success) return reply(400, "INVALID_TECHNICIAN");
  const raw = await readLimitedBody(request, 32 * 1024);
  if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE");
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = technicianProfileSchema.safeParse(input);
  if (!parsed.success) return reply(400, "INVALID_TECHNICIAN");
  const actor = await getSelfHostedCurrentUser();
  if (!actor) return reply(401, "AUTH_REQUIRED");

  try {
    const outcome = await withPostgresActor({ userId: actor.id }, async (client) => {
      const current = await client.query<{ organization_id: string }>("select organization_id from public.technicians where id = $1 for update", [technicianId.data]);
      if (!current.rows[0]) return "NOT_FOUND" as const;
      const value = parsed.data;
      if (current.rows[0].organization_id !== value.organizationId || !await canAdministerSgstiOrganization(client, value.organizationId)) return "DENIED" as const;
      await client.query(
        `update public.technicians set user_id=$2, full_name=$3, email=$4, phone=$5, mobile=$6,
           employee_identifier=$7, job_title=$8, employment_type=$9, hourly_cost=$10,
           visibility_scope=$11::public.user_visibility_scope, external_partner_reference=$12, active=$13
         where id=$1`,
        [technicianId.data, value.userId ?? null, value.fullName, value.email ?? null, value.phone ?? null,
          value.mobile ?? null, value.employeeIdentifier ?? null, value.jobTitle ?? null, value.employmentType,
          value.hourlyCost ?? null, value.visibilityScope, value.externalPartnerReference ?? null, value.active],
      );
      await client.query(
        `insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, after_value, source)
         values ($1,$2,'TECHNICIAN_UPDATED','technician',$3,jsonb_build_object('active',$4),'WEB')`,
        [value.organizationId, actor.id, technicianId.data, value.active],
      );
      return "OK" as const;
    });
    if (outcome === "NOT_FOUND") return reply(404, "TECHNICIAN_NOT_FOUND");
    if (outcome === "DENIED") return reply(403, "ADMINISTRATION_ACCESS_DENIED");
    return Response.json({ technicianId: technicianId.data, updated: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return reply(503, "ADMINISTRATION_UNAVAILABLE");
  }
}
