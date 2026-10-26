import { createServiceRoleClient } from "@/lib/supabase/outbox-admin";

export async function GET(request: Request) {
  const expected = process.env.ONEIT_BILLING_WORKER_SECRET; if (!expected || request.headers.get("x-oneit-worker-secret") !== expected) return Response.json({ code: "WORKER_UNAUTHORIZED" }, { status: 401 });
  const client = createServiceRoleClient();
  const { data, error } = await client.from("billing_email_log").select("status,locked_at,next_attempt_at,attempt_count").in("status", ["QUEUED", "SENT", "FAILED"]).limit(5000);
  if (error) return Response.json({ code: "BILLING_EMAIL_HEALTH_UNAVAILABLE" }, { status: 503 });
  const rows = data ?? []; const now = Date.now(); const health = { queued: rows.filter((row) => row.status === "QUEUED").length, sent: rows.filter((row) => row.status === "SENT").length, failed: rows.filter((row) => row.status === "FAILED").length, locked: rows.filter((row) => row.locked_at && now - new Date(row.locked_at).getTime() < 15 * 60 * 1000).length, overdue: rows.filter((row) => row.status === "QUEUED" && new Date(row.next_attempt_at).getTime() <= now).length };
  return Response.json({ health }, { headers: { "Cache-Control": "no-store" } });
}
