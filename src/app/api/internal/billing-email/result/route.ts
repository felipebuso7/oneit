import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/outbox-admin";

const schema = z.object({ emailLogId: z.string().uuid(), result: z.enum(["SENT", "FAILED"]), providerMessageId: z.string().max(180).optional(), errorMessage: z.string().max(500).optional(), retrySeconds: z.number().int().min(30).max(86400).optional() });

export async function POST(request: Request) {
  const expected = process.env.ONEIT_BILLING_WORKER_SECRET; if (!expected || request.headers.get("x-oneit-worker-secret") !== expected) return Response.json({ code: "WORKER_UNAUTHORIZED" }, { status: 401 });
  let input: unknown; try { input = await request.json(); } catch { return Response.json({ code: "INVALID_JSON" }, { status: 400 }); } const parsed = schema.safeParse(input); if (!parsed.success) return Response.json({ code: "INVALID_WORKER_RESULT" }, { status: 400 });
  const client = createServiceRoleClient(); const value = parsed.data;
  const call = value.result === "SENT" ? client.rpc("complete_billing_email", { target_id: value.emailLogId, target_provider_message_id: value.providerMessageId ?? null }) : client.rpc("fail_billing_email", { target_id: value.emailLogId, target_error: value.errorMessage ?? "EMAIL_PROVIDER_FAILED", target_retry_seconds: value.retrySeconds ?? 300 });
  const { data, error } = await call; if (error) return Response.json({ code: error.message.includes("not_claimed") ? "EMAIL_NOT_CLAIMED" : "EMAIL_RESULT_FAILED" }, { status: error.message.includes("not_claimed") ? 409 : 503 });
  return Response.json({ emailLog: data }, { headers: { "Cache-Control": "no-store" } });
}
