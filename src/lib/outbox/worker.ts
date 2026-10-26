export type ClaimedOutboxEvent = {
  id: string;
  organization_id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string | null;
  payload: Record<string, unknown>;
  attempts: number;
  correlation_id: string;
};

export type OutboxFailure = { message: string; retryable: boolean };
export type OutboxDispatchResult = { ok: true } | { ok: false; failure: OutboxFailure };

export function retryDelaySeconds(attempt: number) {
  return Math.min(3600, 30 * 2 ** Math.max(0, attempt - 1));
}

/**
 * The first worker release intentionally supports only a no-op health event.
 * New external effects must be registered here with an idempotent handler before
 * their producer is enabled by a feature flag.
 */
export async function dispatchOutboxEvent(event: ClaimedOutboxEvent): Promise<OutboxDispatchResult> {
  if (event.event_type === "OUTBOX_HEALTHCHECK") return { ok: true };
  if (["SGSTI_REMINDER", "SGSTI_ASSURANCE_NOTIFICATION"].includes(event.event_type)) {
    const { createServiceRoleClient } = await import("@/lib/supabase/outbox-admin");
    const { error } = await createServiceRoleClient().rpc("deliver_sgsti_notification", { target_event_id: event.id });
    if (!error) return { ok: true };
    return { ok: false, failure: { message: `SGSTI_NOTIFICATION_DELIVERY_FAILED:${error.code ?? "unknown"}`, retryable: true } };
  }
  return { ok: false, failure: { message: `UNSUPPORTED_EVENT_TYPE:${event.event_type}`, retryable: false } };
}

export type OutboxStore = {
  claim(limit: number, lockSeconds: number): Promise<ClaimedOutboxEvent[]>;
  complete(eventId: string): Promise<void>;
  fail(eventId: string, failure: OutboxFailure, retryDelay: number): Promise<void>;
};

export async function processOutboxBatch(store: OutboxStore, limit = 20, lockSeconds = 300) {
  const events = await store.claim(limit, lockSeconds);
  let processed = 0;
  let failed = 0;
  for (const event of events) {
    const result = await dispatchOutboxEvent(event);
    if (result.ok) {
      await store.complete(event.id);
      processed += 1;
    } else {
      await store.fail(event.id, result.failure, retryDelaySeconds(event.attempts));
      failed += 1;
    }
  }
  return { claimed: events.length, processed, failed };
}
