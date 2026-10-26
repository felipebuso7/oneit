import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getPublicEnvironment } from "@/lib/env";
import type { ClaimedOutboxEvent, OutboxFailure, OutboxStore } from "@/lib/outbox/worker";

export function createServiceRoleClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("OUTBOX_SERVICE_ROLE_KEY_MISSING");
  return createClient(getPublicEnvironment().NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createOutboxStore(): OutboxStore {
  const client = createServiceRoleClient();
  return {
    async claim(limit, lockSeconds) {
      const { data, error } = await client.rpc("claim_outbox_events", { target_limit: limit, target_lock_seconds: lockSeconds });
      if (error) throw new Error(`OUTBOX_CLAIM_FAILED:${error.code ?? "unknown"}`);
      return (data ?? []) as ClaimedOutboxEvent[];
    },
    async complete(eventId) {
      const { error } = await client.rpc("complete_outbox_event", { target_event_id: eventId });
      if (error) throw new Error(`OUTBOX_COMPLETE_FAILED:${error.code ?? "unknown"}`);
    },
    async fail(eventId, failure: OutboxFailure, retryDelay) {
      const { error } = await client.rpc("fail_outbox_event", {
        target_event_id: eventId,
        target_error: failure.message,
        target_retryable: failure.retryable,
        target_retry_delay_seconds: retryDelay,
        target_max_attempts: 8,
      });
      if (error) throw new Error(`OUTBOX_FAIL_FAILED:${error.code ?? "unknown"}`);
    },
  };
}

export function createSgstiReminderOutboxStore(): OutboxStore {
  const client = createServiceRoleClient();
  return {
    async claim(limit, lockSeconds) {
      const { data, error } = await client.rpc("claim_sgsti_notification_events", { target_limit: limit, target_lock_seconds: lockSeconds });
      if (error) throw new Error(`SGSTI_OUTBOX_CLAIM_FAILED:${error.code ?? "unknown"}`);
      return (data ?? []) as ClaimedOutboxEvent[];
    },
    async complete(eventId) {
      const { error } = await client.rpc("complete_outbox_event", { target_event_id: eventId });
      if (error) throw new Error(`OUTBOX_COMPLETE_FAILED:${error.code ?? "unknown"}`);
    },
    async fail(eventId, failure, retryDelay) {
      const { error } = await client.rpc("fail_outbox_event", { target_event_id: eventId, target_error: failure.message, target_retryable: failure.retryable, target_retry_delay_seconds: retryDelay, target_max_attempts: 8 });
      if (error) throw new Error(`OUTBOX_FAIL_FAILED:${error.code ?? "unknown"}`);
    },
  };
}
