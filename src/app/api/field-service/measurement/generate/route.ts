import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { hasSameOrigin } from "@/lib/http/same-origin";
import { readLimitedBody } from "@/lib/http/limited-body";

const schema = z.object({ organizationId: z.string().uuid(), competence: z.string().regex(/^\d{4}-\d{2}-01$/) });
const reply = (status: number, code: string) => Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED");
  const raw = await readLimitedBody(request, 8 * 1024);
  if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE");
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = schema.safeParse(input);
  if (!parsed.success) return reply(400, "INVALID_MEASUREMENT");
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");
  const { data, error } = await supabase.rpc("generate_field_service_measurement", {
    target_organization_id: parsed.data.organizationId,
    target_competence: parsed.data.competence,
    target_actor: auth.user.id,
  });
  if (error) {
    if (error.message.includes("forbidden")) return reply(403, "MEASUREMENT_GENERATION_FORBIDDEN");
    if (error.message.includes("invalid_state")) return reply(409, "MEASUREMENT_GENERATION_INVALID_STATE");
    if (error.message.includes("no_closed")) return reply(409, "NO_CLOSED_FIELD_SERVICE_ORDERS");
    if (error.message.includes("no_lpu")) return reply(409, "NO_LPU_LINES");
    if (error.message.includes("competence")) return reply(400, "INVALID_MEASUREMENT_COMPETENCE");
    return reply(503, "MEASUREMENT_GENERATION_UNAVAILABLE");
  }
  return Response.json({ measurementSheet: data }, { headers: { "Cache-Control": "no-store" } });
}
