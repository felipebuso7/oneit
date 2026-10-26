import { z } from "zod";
import { withPostgresActor } from "@/lib/database/postgres";
import { getSelfHostedCurrentUser } from "@/lib/auth/self-hosted-current-user";
import { hasSameOrigin } from "@/lib/http/same-origin";
import { readLimitedBody } from "@/lib/http/limited-body";
import { canAdministerSgstiOrganization } from "@/lib/sgsti/access";
import { sgstiDocumentObsolescenceSchema } from "@/lib/validation/sgsti";

const identifierSchema = z.uuid();

function reply(status: number, code: string) {
  return Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.ONEIT_DEPLOYMENT_MODE !== "self_hosted") return reply(409, "SELF_HOSTED_MODE_REQUIRED");
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED");
  const documentId = identifierSchema.safeParse((await params).id);
  if (!documentId.success) return reply(400, "INVALID_DOCUMENT");
  const raw = await readLimitedBody(request, 16 * 1024);
  if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE");
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = sgstiDocumentObsolescenceSchema.safeParse(input);
  if (!parsed.success || parsed.data.documentId !== documentId.data) return reply(400, "INVALID_OBSOLESCENCE");
  const user = await getSelfHostedCurrentUser();
  if (!user) return reply(401, "AUTH_REQUIRED");

  try {
    const outcome = await withPostgresActor({ userId: user.id }, async (client) => {
      const document = await client.query<{ organization_id: string; document_kind: string; status: string }>(
        "select organization_id, document_kind, status from public.sgsti_documents where id = $1 for update",
        [documentId.data],
      );
      const item = document.rows[0];
      if (!item) return "NOT_FOUND" as const;
      if (!await canAdministerSgstiOrganization(client, item.organization_id)) return "DENIED" as const;
      if (item.document_kind !== "DOCUMENT") return "FOLDER" as const;
      if (item.status === "OBSOLETE") return "ALREADY_OBSOLETE" as const;

      await client.query(
        `update public.sgsti_documents set status = 'OBSOLETE', obsolete_at = current_date,
           obsolete_reason = $2 where id = $1`,
        [documentId.data, parsed.data.reason],
      );
      await client.query(
        `insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, after_value, source)
         values ($1,$2,'SGSTI_DOCUMENT_OBSOLETED','sgsti_document',$3,
                 jsonb_build_object('reason',$4),'WEB')`,
        [item.organization_id, user.id, documentId.data, parsed.data.reason],
      );
      return "OK" as const;
    });
    if (outcome === "NOT_FOUND") return reply(404, "DOCUMENT_NOT_FOUND");
    if (outcome === "DENIED") return reply(403, "SGSTI_ADMIN_REQUIRED");
    if (outcome === "FOLDER") return reply(422, "FOLDER_CANNOT_BE_OBSOLETED");
    if (outcome === "ALREADY_OBSOLETE") return reply(409, "DOCUMENT_ALREADY_OBSOLETE");
    return Response.json({ documentId: documentId.data, status: "OBSOLETE" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return reply(503, "SGSTI_UNAVAILABLE");
  }
}
