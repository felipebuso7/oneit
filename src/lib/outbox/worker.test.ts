import { describe, expect, it } from "vitest";
import { processOutboxBatch, retryDelaySeconds, type ClaimedOutboxEvent, type OutboxStore } from "./worker";

const event = (eventType: string, attempts = 1): ClaimedOutboxEvent => ({
  id: "7f329ce8-f138-4bc5-9c5d-1a68a3dcf630", organization_id: "b0161bda-78fd-4bcb-8474-9862f15b616a",
  event_type: eventType, aggregate_type: "SYSTEM", aggregate_id: null, payload: {}, attempts,
  correlation_id: "9972d7f2-ea85-42ef-beb2-1ea2944907f6",
});

describe("outbox worker", () => {
  it("uses bounded exponential retry intervals", () => {
    expect(retryDelaySeconds(1)).toBe(30);
    expect(retryDelaySeconds(2)).toBe(60);
    expect(retryDelaySeconds(20)).toBe(3600);
  });

  it("completes only registered event types", async () => {
    const completed: string[] = []; const failed: string[] = [];
    const store: OutboxStore = {
      claim: async () => [event("OUTBOX_HEALTHCHECK"), event("EMAIL_SEND", 3)],
      complete: async (id) => { completed.push(id); },
      fail: async (id, failure, delay) => { failed.push(`${id}:${failure.retryable}:${delay}`); },
    };
    await expect(processOutboxBatch(store)).resolves.toEqual({ claimed: 2, processed: 1, failed: 1 });
    expect(completed).toHaveLength(1);
    expect(failed[0]).toContain(":false:120");
  });
});
