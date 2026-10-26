import { createClient } from "@/lib/supabase/server";
import { readLimitedBody } from "@/lib/http/limited-body";
import { z } from "zod";

const inputSchema = z.object({ token: z.string().min(32).max(128), code: z.string().regex(/^\d{6}$/) });

function reply(status: number, code: string) {
  return Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON_REQUIRED");
  const raw = await readLimitedBody(request, 2048);
  if (raw === null) return reply(413, "PAYLOAD_TOO_LARGE");
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return reply(400, "INVALID_JSON"); }
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) return reply(400, "INVALID_ACCESS_DATA");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_partner_service_order_context", { target_token: parsed.data.token, target_code: parsed.data.code });
  if (error || !data?.[0]) {
    const message = error?.message ?? "";
    if (!message.includes("EXPIRED") && !message.includes("LOCKED")) {
      await supabase.rpc("record_partner_access_failure", { target_token: parsed.data.token });
    }
    if (message.includes("EXPIRED")) return reply(410, "ACCESS_EXPIRED");
    if (message.includes("LOCKED")) return reply(429, "ACCESS_LOCKED");
    return reply(401, "ACCESS_INVALID");
  }
  const { data: progress, error: progressError } = await supabase.rpc("get_partner_access_progress", { target_token: parsed.data.token, target_code: parsed.data.code });
  if (progressError || !progress?.[0]) return reply(503, "ACCESS_PROGRESS_UNAVAILABLE");
  return Response.json({ context: { ...data[0], access_expires_at: progress[0].expires_at, partner_accepted: progress[0].accepted } }, { headers: { "Cache-Control": "no-store" } });
}
