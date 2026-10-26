import { z } from "zod";
import { withPostgresActor } from "@/lib/database/postgres";
import { getSelfHostedCurrentUser } from "@/lib/auth/self-hosted-current-user";
import { hasSameOrigin } from "@/lib/http/same-origin";
import { readLimitedBody } from "@/lib/http/limited-body";
import { canManageSgstiOrganization } from "@/lib/sgsti/access";
import { sgstiEvidenceSchema } from "@/lib/validation/sgsti";

const identifierSchema = z.uuid();

function reply(status: number, code: string) {
  return Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.ONEIT_DEPLOYMENT_MODE !== "self_hosted") return reply(409, "SELF_HOSTED_MODE_REQUIRED");
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED");

  const occurrenceId = identifierSchema.safeParse((await params).id);
  if (!occurrenceId.success) return reply(400, "INVALID_ACTIVITY");
  const raw = await readLimitedBody(request, 32 * 1024);
  if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE");
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = sgstiEvidenceSchema.safeParse(input);
  if (!parsed.success || parsed.data.occurrenceId !== occurrenceId.data || parsed.data.auditId) return reply(400, "INVALID_EVIDENCE");

  const user = await getSelfHostedCurrentUser();
  if (!user) return reply(401, "AUTH_REQUIRED");

  try {
    const evidence = await withPostgresActor({ userId: user.id }, async (client) => {
      const occurrence = await client.query<{ organization_id: string; status: string }>(
        "select organization_id, status from public.sgsti_activity_occurrences where id = $1",
        [occurrenceId.data],
      );
      const item = occurrence.rows[0];
      if (!item) return null;
      if (!await canManageSgstiOrganization(client, item.organization_id)) return false;
      const created = await client.query<{ id: string }>(
        `insert into public.sgsti_evidences (
           organization_id, occurrence_id, title, description, evidence_kind,
           external_url, storage_key, note, captured_by
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
        [
          item.organization_id, occurrenceId.data, parsed.data.title, parsed.data.title,
          parsed.data.evidenceKind, parsed.data.externalUrl ?? null,
          parsed.data.storageKey ?? null, parsed.data.note ?? null, user.id,
        ],
      );
      return created.rows[0]?.id ?? null;
    });
    if (evidence === null) return reply(404, "ACTIVITY_NOT_FOUND");
    if (evidence === false) return reply(403, "SGSTI_MANAGEMENT_DENIED");
    return Response.json({ evidenceId: evidence }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return reply(503, "SGSTI_UNAVAILABLE");
  }
}
