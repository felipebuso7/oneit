import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withPostgresActor } from "@/lib/database/postgres";
import { getSelfHostedCurrentUser } from "@/lib/auth/self-hosted-current-user";
import { hasSameOrigin } from "@/lib/http/same-origin";
import { readLimitedBody } from "@/lib/http/limited-body";
import { sgstiActivityTemplateSchema } from "@/lib/validation/sgsti";
import { canManageSgstiOrganization, canReadSgstiOrganization } from "@/lib/sgsti/access";

const organizationQuerySchema = z.object({ organizationId: z.uuid() });

function reply(status: number, code: string) {
  return Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });
}

function isSelfHosted() {
  return process.env.ONEIT_DEPLOYMENT_MODE === "self_hosted";
}

export async function GET(request: Request) {
  if (!isSelfHosted()) return reply(409, "SELF_HOSTED_MODE_REQUIRED");
  const parsedQuery = organizationQuerySchema.safeParse({ organizationId: new URL(request.url).searchParams.get("organizationId") });
  if (!parsedQuery.success) return reply(400, "INVALID_ORGANIZATION");

  const user = await getSelfHostedCurrentUser();
  if (!user) return reply(401, "AUTH_REQUIRED");

  try {
    const activities = await withPostgresActor({ userId: user.id }, async (client) => {
      if (!await canReadSgstiOrganization(client, parsedQuery.data.organizationId)) return null;
      const result = await client.query<{
        id: string; title: string; activity_type: string; competence: string; planned_at: string; due_at: string;
        completed_at: string | null; status: string; requirement_reference: string | null; policy_reference: string | null;
        responsible_id: string | null; result_summary: string | null;
      }>(
        `select id, title, activity_type, competence, planned_at, due_at, completed_at, status,
                requirement_reference, policy_reference, responsible_id, result_summary
           from public.sgsti_activity_occurrences
          where organization_id = $1
          order by due_at asc, planned_at asc, title asc`,
        [parsedQuery.data.organizationId],
      );
      return result.rows;
    });
    if (activities === null) return reply(403, "ORGANIZATION_ACCESS_DENIED");
    return Response.json({ activities }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return reply(503, "SGSTI_UNAVAILABLE");
  }
}

export async function POST(request: Request) {
  if (!isSelfHosted()) return reply(409, "SELF_HOSTED_MODE_REQUIRED");
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED");

  const raw = await readLimitedBody(request, 32 * 1024);
  if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE");
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = sgstiActivityTemplateSchema.safeParse(input);
  if (!parsed.success) return reply(400, "INVALID_ACTIVITY_TEMPLATE");

  const user = await getSelfHostedCurrentUser();
  if (!user) return reply(401, "AUTH_REQUIRED");

  try {
    const activity = await withPostgresActor({ userId: user.id }, async (client) => {
      const template = parsed.data;
      if (!await canManageSgstiOrganization(client, template.organizationId)) return null;

      const created = await client.query<{ id: string }>(
        `insert into public.sgsti_activity_templates (
           organization_id, process_id, title, activity_type, requirement_reference, policy_reference,
           periodicity, custom_interval_days, effective_from, lead_time_days, reminder_days,
           due_after_days, responsible_id
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         returning id`,
        [
          template.organizationId, template.processId ?? null, template.title, template.activityType,
          template.isoReference ?? null, template.policyReference ?? null, template.periodicity,
          template.customIntervalDays ?? null, template.effectiveFrom, template.leadTimeDays,
          template.reminderDays, template.dueAfterDays, template.defaultResponsibleId ?? null,
        ],
      );

      const effectiveAt = new Date(`${template.effectiveFrom}T00:00:00.000Z`);
      effectiveAt.setUTCDate(effectiveAt.getUTCDate() + Math.max(30, template.leadTimeDays));
      const generation = await client.query<{ generated: number }>(
        "select public.generate_sgsti_occurrences($1, $2::date) as generated",
        [template.organizationId, effectiveAt.toISOString().slice(0, 10)],
      );

      return { templateId: created.rows[0]?.id, generatedOccurrences: generation.rows[0]?.generated ?? 0 };
    });
    if (activity === null) return reply(403, "SGSTI_MANAGEMENT_DENIED");
    revalidatePath("/portal/sgsti");
    return Response.json(activity, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return reply(503, "SGSTI_UNAVAILABLE");
  }
}
