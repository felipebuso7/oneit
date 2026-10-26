import { timingSafeEqual } from "node:crypto";
import { processOutboxBatch } from "@/lib/outbox/worker";
import { createOutboxStore } from "@/lib/supabase/outbox-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(value: string | null, secret: string | undefined) {
  if (!secret || !value?.startsWith("Bearer ")) return false;
  const provided = Buffer.from(value.slice(7));
  const expected = Buffer.from(secret);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export async function POST(request: Request) {
  if (!authorized(request.headers.get("authorization"), process.env.OUTBOX_WORKER_SECRET)) {
    return Response.json({ code: "WORKER_AUTH_REQUIRED" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const result = await processOutboxBatch(createOutboxStore());
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("outbox worker failure", error instanceof Error ? error.message : "unknown");
    return Response.json({ code: "OUTBOX_WORKER_UNAVAILABLE" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
