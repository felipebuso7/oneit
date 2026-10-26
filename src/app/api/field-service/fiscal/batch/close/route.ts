import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { readLimitedBody } from "@/lib/http/limited-body";
import { hasSameOrigin } from "@/lib/http/same-origin";

const schema = z.object({ batchId: z.string().uuid() });
const reply = (status: number, code: string) => Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return reply(403, "ORIGIN_REJECTED");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED");
  const raw = await readLimitedBody(request, 4 * 1024); if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE");
  let input: unknown; try { input = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = schema.safeParse(input); if (!parsed.success) return reply(400, "INVALID_FISCAL_BATCH");
  const supabase = await createClient(); const { data: auth, error: authError } = await supabase.auth.getUser(); if (authError || !auth.user) return reply(401, "AUTH_REQUIRED");
  const { data, error } = await supabase.rpc("close_fiscal_batch", { target_batch_id: parsed.data.batchId, target_actor: auth.user.id });
  if (error) { if (error.message.includes("not_found")) return reply(404, "FISCAL_BATCH_NOT_FOUND"); if (error.message.includes("forbidden")) return reply(403, "FISCAL_BATCH_FORBIDDEN"); if (error.message.includes("invalid_state")) return reply(409, "FISCAL_BATCH_INVALID_STATE"); return reply(503, "FISCAL_BATCH_CLOSE_UNAVAILABLE"); }
  return Response.json({ fiscalBatch: data }, { headers: { "Cache-Control": "no-store" } });
}
