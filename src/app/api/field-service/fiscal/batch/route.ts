import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { readLimitedBody } from "@/lib/http/limited-body";
import { hasSameOrigin } from "@/lib/http/same-origin";

const schema = z.object({ organizationId: z.string().uuid(), competence: z.string().regex(/^\d{4}-\d{2}-01$/) });
function reply(status: number, code: string) { return Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } }); }

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED");
  const raw = await readLimitedBody(request, 8 * 1024); if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE");
  let input: unknown; try { input = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = schema.safeParse(input); if (!parsed.success) return reply(400, "INVALID_FISCAL_BATCH");
  const supabase = await createClient(); const { data: auth, error: authError } = await supabase.auth.getUser(); if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");
  const { data, error } = await supabase.rpc("create_fiscal_batch", { target_organization_id: parsed.data.organizationId, target_competence: parsed.data.competence, target_actor: auth.user.id });
  if (error) { if (error.message.includes("forbidden")) return reply(403, "FISCAL_BATCH_FORBIDDEN"); if (error.message.includes("no_approved")) return reply(409, "NO_APPROVED_MEASUREMENTS"); if (error.message.includes("month_start")) return reply(400, "COMPETENCE_MUST_START_MONTH"); return reply(503, "FISCAL_BATCH_UNAVAILABLE"); }
  return Response.json({ fiscalBatch: data }, { headers: { "Cache-Control": "no-store" } });
}
