import { createServiceRoleClient } from "@/lib/supabase/outbox-admin";

export async function POST(request: Request) {
  const expected = process.env.ONEIT_BILLING_WORKER_SECRET;
  if (!expected || request.headers.get("x-oneit-worker-secret") !== expected) return Response.json({ code: "WORKER_UNAUTHORIZED" }, { status: 401 });
  const client = createServiceRoleClient();
  const { data, error } = await client.rpc("claim_billing_email", { target_worker: "billing-email-worker" });
  if (error) return Response.json({ code: "BILLING_EMAIL_CLAIM_FAILED" }, { status: 503 });
  return Response.json({ message: data ?? null }, { headers: { "Cache-Control": "no-store" } });
}
