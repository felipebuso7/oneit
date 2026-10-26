import { z } from "zod";
import { withPostgresActor } from "@/lib/database/postgres";
import { getSelfHostedCurrentUser } from "@/lib/auth/self-hosted-current-user";
import { hasSameOrigin } from "@/lib/http/same-origin";
import { readLimitedBody } from "@/lib/http/limited-body";
import { canManageSgstiOrganization, canReadSgstiOrganization } from "@/lib/sgsti/access";
import { sgstiDocumentSchema } from "@/lib/validation/sgsti";

const querySchema = z.object({ organizationId: z.uuid(), parentId: z.uuid().nullable().optional() });

function reply(status: number, code: string) {
  return Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });
}

function selfHostedRequired() {
  return process.env.ONEIT_DEPLOYMENT_MODE === "self_hosted";
}

export async function GET(request: Request) {
  if (!selfHostedRequired()) return reply(409, "SELF_HOSTED_MODE_REQUIRED");
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    organizationId: url.searchParams.get("organizationId"),
    parentId: url.searchParams.get("parentId") || null,
  });
  if (!parsed.success) return reply(400, "INVALID_DOCUMENT_QUERY");
  const user = await getSelfHostedCurrentUser();
  if (!user) return reply(401, "AUTH_REQUIRED");

  try {
    const documents = await withPostgresActor({ userId: user.id }, async (client) => {
      if (!await canReadSgstiOrganization(client, parsed.data.organizationId)) return null;
      const result = await client.query<{
        id: string; parent_id: string | null; document_kind: string; code: string | null; title: string;
        version: string | null; status: string; drive_url: string | null; storage_key: string | null;
        last_reviewed_at: string | null; last_approved_at: string | null; next_review_at: string | null;
      }>(
        `select id, parent_id, document_kind, code, title, version, status, drive_url, storage_key,
                last_reviewed_at, last_approved_at, next_review_at
           from public.sgsti_documents
          where organization_id = $1
            and parent_id is not distinct from $2::uuid
          order by document_kind asc, title asc`,
        [parsed.data.organizationId, parsed.data.parentId ?? null],
      );
      return result.rows;
    });
    if (documents === null) return reply(403, "ORGANIZATION_ACCESS_DENIED");
    return Response.json({ documents }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return reply(503, "SGSTI_UNAVAILABLE");
  }
}

export async function POST(request: Request) {
  if (!selfHostedRequired()) return reply(409, "SELF_HOSTED_MODE_REQUIRED");
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED");
  const raw = await readLimitedBody(request, 32 * 1024);
  if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE");
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = sgstiDocumentSchema.safeParse(input);
  if (!parsed.success) return reply(400, "INVALID_DOCUMENT");
  const user = await getSelfHostedCurrentUser();
  if (!user) return reply(401, "AUTH_REQUIRED");

  try {
    const document = await withPostgresActor({ userId: user.id }, async (client) => {
      const item = parsed.data;
      if (!await canManageSgstiOrganization(client, item.organizationId)) return null;
      if (item.parentId) {
        const parent = await client.query<{ document_kind: string }>(
          "select document_kind from public.sgsti_documents where id = $1 and organization_id = $2",
          [item.parentId, item.organizationId],
        );
        if (parent.rows[0]?.document_kind !== "FOLDER") return false;
      }
      const created = await client.query<{ id: string }>(
        `insert into public.sgsti_documents (
           organization_id, process_id, parent_id, document_kind, title, drive_url, storage_key,
           owner_id, next_review_at, status
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`,
        [
          item.organizationId, item.processId ?? null, item.parentId ?? null, item.documentType,
          item.title, item.externalUrl ?? null, item.storageKey ?? null, user.id,
          item.nextReviewAt ?? null, item.documentType === "FOLDER" ? "EFFECTIVE" : "DRAFT",
        ],
      );
      return created.rows[0]?.id ?? null;
    });
    if (document === null) return reply(403, "SGSTI_MANAGEMENT_DENIED");
    if (document === false) return reply(422, "DOCUMENT_PARENT_MUST_BE_FOLDER");
    return Response.json({ documentId: document }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return reply(503, "SGSTI_UNAVAILABLE");
  }
}
