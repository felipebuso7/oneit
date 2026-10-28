import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withPostgresActor } from "@/lib/database/postgres";
import { getSelfHostedCurrentUser } from "@/lib/auth/self-hosted-current-user";
import { hasSameOrigin } from "@/lib/http/same-origin";
import { readLimitedBody } from "@/lib/http/limited-body";
import { canManageSgstiOrganization } from "@/lib/sgsti/access";
import { sgstiExecutionUpdateSchema } from "@/lib/validation/sgsti";

const identifierSchema = z.uuid();

function reply(status: number, code: string) {
  return Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.ONEIT_DEPLOYMENT_MODE !== "self_hosted") return reply(409, "SELF_HOSTED_MODE_REQUIRED");
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED");

  const occurrenceId = identifierSchema.safeParse((await params).id);
  if (!occurrenceId.success) return reply(400, "INVALID_ACTIVITY");
  const raw = await readLimitedBody(request, 128 * 1024);
  if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE");
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = sgstiExecutionUpdateSchema.safeParse(input);
  if (!parsed.success || parsed.data.occurrenceId !== occurrenceId.data) return reply(400, "INVALID_EXECUTION_RECORD");

  const user = await getSelfHostedCurrentUser();
  if (!user) return reply(401, "AUTH_REQUIRED");

  try {
    const record = await withPostgresActor({ userId: user.id }, async (client) => {
      const occurrence = await client.query<{ organization_id: string; status: string }>(
        "select organization_id, status from public.sgsti_activity_occurrences where id = $1 for update",
        [occurrenceId.data],
      );
      const item = occurrence.rows[0];
      if (!item) return { code: "ACTIVITY_NOT_FOUND" as const };
      if (!await canManageSgstiOrganization(client, item.organization_id)) return { code: "SGSTI_MANAGEMENT_DENIED" as const };
      if (["COMPLETED", "CANCELLED"].includes(item.status)) return { code: "ACTIVITY_LOCKED" as const };

      await client.query(
        `insert into public.sgsti_execution_records (
           occurrence_id, attendees, minutes, decisions, result, action_summary,
           recorded_by, recorded_at
         ) values ($1,$2,$3,$4,$5,$6,$7,clock_timestamp())
         on conflict (occurrence_id) do update set
           attendees = excluded.attendees, minutes = excluded.minutes, decisions = excluded.decisions,
           result = excluded.result, action_summary = excluded.action_summary,
           recorded_by = excluded.recorded_by, recorded_at = clock_timestamp()`,
        [
          occurrenceId.data, parsed.data.attendees ?? null, parsed.data.minutes ?? null,
          parsed.data.decisions ?? null, parsed.data.resultSummary ?? null,
          parsed.data.actionPlan ?? null, user.id,
        ],
      );
      await client.query(
        `update public.sgsti_activity_occurrences set
           status = $2::public.sgsti_activity_status,
           result_summary = coalesce(nullif($3, ''), result_summary),
           justification = coalesce(nullif($4, ''), justification),
           completed_at = case when $2 = 'COMPLETED' then clock_timestamp() else completed_at end
         where id = $1`,
        [occurrenceId.data, parsed.data.status, parsed.data.resultSummary ?? null, parsed.data.justification ?? null],
      );
      await client.query(
        `insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, after_value, source)
         values ($1,$2,'SGSTI_EXECUTION_RECORDED','sgsti_activity_occurrence',$3,
                 jsonb_build_object('status',$4),'WEB')`,
        [item.organization_id, user.id, occurrenceId.data, parsed.data.status],
      );
      return { code: "OK" as const };
    });

    if (record.code === "ACTIVITY_NOT_FOUND") return reply(404, record.code);
    if (record.code === "SGSTI_MANAGEMENT_DENIED") return reply(403, record.code);
    if (record.code === "ACTIVITY_LOCKED") return reply(409, record.code);
    revalidatePath("/portal/sgsti");
    return Response.json({ occurrenceId: occurrenceId.data, status: parsed.data.status }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return reply(503, "SGSTI_UNAVAILABLE");
  }
}
