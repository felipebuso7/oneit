import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSelfHostedCurrentUser } from "@/lib/auth/self-hosted-current-user";
import { withPostgresActor } from "@/lib/database/postgres";
import { hasSameOrigin } from "@/lib/http/same-origin";
import { readLimitedBody } from "@/lib/http/limited-body";
import { canManageSgstiOrganization, canReadSgstiOrganization } from "@/lib/sgsti/access";
import { sgstiMasterPlanCreateSchema } from "@/lib/validation/sgsti-master-plan";

const organizationQuerySchema = z.object({ organizationId: z.uuid() });

function reply(status: number, code: string) {
  return Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });
}

function isSelfHosted() {
  return process.env.ONEIT_DEPLOYMENT_MODE === "self_hosted";
}

async function readJson(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) return { error: reply(415, "JSON_REQUIRED") };
  const raw = await readLimitedBody(request, 256 * 1024);
  if (raw === null) return { error: reply(413, "PAYLOAD_TOO_LARGE") };
  try { return { value: JSON.parse(raw) as unknown }; } catch { return { error: reply(400, "INVALID_JSON") }; }
}

export async function GET(request: Request) {
  if (!isSelfHosted()) return reply(409, "SELF_HOSTED_MODE_REQUIRED");
  const parsed = organizationQuerySchema.safeParse({ organizationId: new URL(request.url).searchParams.get("organizationId") });
  if (!parsed.success) return reply(400, "INVALID_ORGANIZATION");
  const user = await getSelfHostedCurrentUser();
  if (!user) return reply(401, "AUTH_REQUIRED");

  try {
    const result = await withPostgresActor({ userId: user.id }, async (client) => {
      if (!await canReadSgstiOrganization(client, parsed.data.organizationId)) return null;
      const initiatives = await client.query<{
        id: string; code: string; title: string; description: string | null; priority: string; iso_references: string[];
        owner_id: string | null; due_at: string | null; status: string;
      }>(`select id, code, title, description, priority, iso_references, owner_id, due_at, status
           from public.sgsti_initiatives where organization_id=$1 order by priority, code`, [parsed.data.organizationId]);
      const tasks = await client.query<{
        id: string; initiative_id: string; code: string; title: string; acceptance_criteria: string; expected_evidence: string;
        owner_id: string | null; due_at: string | null; status: string; execution_summary: string | null; blocker_reason: string | null;
        evidence_count: number; action_count: number;
      }>(`select t.id, t.initiative_id, t.code, t.title, t.acceptance_criteria, t.expected_evidence, t.owner_id, t.due_at,
                  t.status, t.execution_summary, t.blocker_reason,
                  (select count(*)::int from public.sgsti_initiative_task_evidences e where e.task_id=t.id) as evidence_count,
                  (select count(*)::int from public.sgsti_initiative_task_actions a where a.task_id=t.id) as action_count
             from public.sgsti_initiative_tasks t
             join public.sgsti_initiatives i on i.id=t.initiative_id
            where i.organization_id=$1 order by t.code`, [parsed.data.organizationId]);
      return { initiatives: initiatives.rows, tasks: tasks.rows };
    });
    if (result === null) return reply(403, "ORGANIZATION_ACCESS_DENIED");
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return reply(503, "SGSTI_MASTER_PLAN_UNAVAILABLE");
  }
}

export async function POST(request: Request) {
  if (!isSelfHosted()) return reply(409, "SELF_HOSTED_MODE_REQUIRED");
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  const body = await readJson(request);
  if ("error" in body) return body.error;
  const parsed = sgstiMasterPlanCreateSchema.safeParse(body.value);
  if (!parsed.success) return reply(400, "INVALID_MASTER_PLAN_INPUT");
  const user = await getSelfHostedCurrentUser();
  if (!user) return reply(401, "AUTH_REQUIRED");

  try {
    const created = await withPostgresActor({ userId: user.id }, async (client) => {
      const input = parsed.data;
      if (!await canManageSgstiOrganization(client, input.organizationId)) return null;
      const initiative = await client.query<{ id: string }>(
        `insert into public.sgsti_initiatives(organization_id,code,title,description,priority,iso_references,owner_id,due_at,created_by)
         values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
        [input.organizationId, input.code, input.title, input.description ?? null, input.priority, input.isoReferences, input.ownerId ?? null, input.dueAt ?? null, user.id],
      );
      const initiativeId = initiative.rows[0]?.id;
      if (!initiativeId) throw new Error("SGSTI_INITIATIVE_CREATION_FAILED");
      for (const task of input.tasks) {
        await client.query(
          `insert into public.sgsti_initiative_tasks(initiative_id,code,title,acceptance_criteria,expected_evidence,owner_id,due_at)
           values($1,$2,$3,$4,$5,$6,$7)`,
          [initiativeId, task.code, task.title, task.acceptanceCriteria, task.expectedEvidence, task.ownerId ?? null, task.dueAt ?? null],
        );
      }
      await client.query(
        `insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,after_value,source)
         values($1,$2,'SGSTI_INITIATIVE_CREATED','sgsti_initiative',$3,jsonb_build_object('code',$4,'task_count',$5),'WEB')`,
        [input.organizationId, user.id, initiativeId, input.code, input.tasks.length],
      );
      return { initiativeId, taskCount: input.tasks.length };
    });
    if (created === null) return reply(403, "SGSTI_MANAGEMENT_DENIED");
    revalidatePath("/demo/sgsti/action-plan");
    return Response.json(created, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return reply(503, "SGSTI_MASTER_PLAN_UNAVAILABLE");
  }
}
