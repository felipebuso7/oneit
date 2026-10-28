import { revalidatePath } from "next/cache";
import { getSelfHostedCurrentUser } from "@/lib/auth/self-hosted-current-user";
import { withPostgresActor } from "@/lib/database/postgres";
import { hasSameOrigin } from "@/lib/http/same-origin";
import { readLimitedBody } from "@/lib/http/limited-body";
import { canManageSgstiOrganization } from "@/lib/sgsti/access";
import { sgstiTaskExecutionSchema } from "@/lib/validation/sgsti-master-plan";

function reply(status: number, code: string) { return Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } }); }

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.ONEIT_DEPLOYMENT_MODE !== "self_hosted") return reply(409, "SELF_HOSTED_MODE_REQUIRED");
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED");
  const raw = await readLimitedBody(request, 64 * 1024);
  if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE");
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const { id } = await params;
  const parsed = sgstiTaskExecutionSchema.safeParse({ ...(typeof body === "object" && body ? body : {}), taskId: id });
  if (!parsed.success) return reply(400, "INVALID_TASK_EXECUTION");
  const user = await getSelfHostedCurrentUser();
  if (!user) return reply(401, "AUTH_REQUIRED");
  try {
    await withPostgresActor({ userId: user.id }, async (client) => {
      const input = parsed.data;
      const task = await client.query<{ organization_id: string }>(`select i.organization_id from public.sgsti_initiative_tasks t join public.sgsti_initiatives i on i.id=t.initiative_id where t.id=$1`, [input.taskId]);
      const organizationId = task.rows[0]?.organization_id;
      if (!organizationId || !await canManageSgstiOrganization(client, organizationId)) throw new Error("SGSTI_TASK_NOT_AUTHORIZED");
      for (const evidenceId of input.evidenceIds) {
        const linked = await client.query<{ evidence_id: string }>(
          `insert into public.sgsti_initiative_task_evidences(task_id,evidence_id,linked_by)
           select $1,e.id,$3 from public.sgsti_evidences e where e.id=$2 and e.organization_id=$4
           on conflict(task_id,evidence_id) do nothing returning evidence_id`,
          [input.taskId, evidenceId, user.id, organizationId],
        );
        const exists = linked.rowCount || (await client.query("select 1 from public.sgsti_initiative_task_evidences where task_id=$1 and evidence_id=$2", [input.taskId, evidenceId])).rowCount;
        if (!exists) throw new Error("SGSTI_EVIDENCE_NOT_AVAILABLE");
      }
      await client.query("select public.update_sgsti_initiative_task_execution($1,$2,$3,$4,$5)", [input.taskId, input.status, input.executionSummary ?? null, input.blockerReason ?? null, null]);
    });
    revalidatePath("/portal/sgsti/action-plan");
    return Response.json({ updated: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return reply(503, "SGSTI_TASK_UPDATE_UNAVAILABLE");
  }
}
