import { timingSafeEqual } from "node:crypto";
import { processOutboxBatch } from "@/lib/outbox/worker";
import { createServiceRoleClient, createSgstiReminderOutboxStore } from "@/lib/supabase/outbox-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(value: string | null, secret: string | undefined) {
  if (!secret || !value?.startsWith("Bearer ")) return false;
  const provided = Buffer.from(value.slice(7)); const expected = Buffer.from(secret);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export async function POST(request: Request) {
  if (!authorized(request.headers.get("authorization"), process.env.OUTBOX_WORKER_SECRET)) return Response.json({ code: "WORKER_AUTH_REQUIRED" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  try {
    const client = createServiceRoleClient();
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: scheduled, error }, { data: assuranceScheduled, error: assuranceError }] = await Promise.all([
      client.rpc("schedule_sgsti_reminders", { target_day: today }),
      client.rpc("schedule_sgsti_assurance_overdues", { target_day: today }),
    ]);
    if (error || assuranceError) throw new Error(`SGSTI_REMINDER_SCHEDULE_FAILED:${error?.code ?? assuranceError?.code ?? "unknown"}`);
    const dispatched = await processOutboxBatch(createSgstiReminderOutboxStore());
    return Response.json({ scheduled: scheduled ?? 0, assuranceScheduled: assuranceScheduled ?? 0, dispatched }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("sgsti reminder scheduler failure", error instanceof Error ? error.message : "unknown");
    return Response.json({ code: "SGSTI_REMINDER_SCHEDULER_UNAVAILABLE" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
