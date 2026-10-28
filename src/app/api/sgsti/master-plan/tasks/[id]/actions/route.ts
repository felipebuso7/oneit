import { revalidatePath } from "next/cache";
import { getSelfHostedCurrentUser } from "@/lib/auth/self-hosted-current-user";
import { withPostgresActor } from "@/lib/database/postgres";
import { hasSameOrigin } from "@/lib/http/same-origin";
import { readLimitedBody } from "@/lib/http/limited-body";
import { sgstiTaskActionSchema } from "@/lib/validation/sgsti-master-plan";

function reply(status: number, code: string) { return Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } }); }

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.ONEIT_DEPLOYMENT_MODE !== "self_hosted") return reply(409, "SELF_HOSTED_MODE_REQUIRED");
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED");
  const raw = await readLimitedBody(request, 64 * 1024);
  if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE");
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const { id } = await params;
  const parsed = sgstiTaskActionSchema.safeParse({ ...(typeof body === "object" && body ? body : {}), taskId: id });
  if (!parsed.success) return reply(400, "INVALID_ACTION_INPUT");
  const user = await getSelfHostedCurrentUser();
  if (!user) return reply(401, "AUTH_REQUIRED");
  try {
    const result = await withPostgresActor({ userId: user.id }, async (client) => {
      const input = parsed.data;
      const action = await client.query<{ action_id: string }>("select public.create_sgsti_task_action_plan($1,$2,$3,$4,$5,$6) as action_id", [input.taskId, input.actionKind, input.description, input.priority, input.ownerId ?? null, input.dueAt ?? null]);
      return { actionId: action.rows[0]?.action_id };
    });
    revalidatePath("/portal/sgsti/action-plan");
    return Response.json(result, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return reply(503, "SGSTI_ACTION_CREATION_UNAVAILABLE");
  }
}
