"use client";

import { useEffect } from "react";

type ExecutionRecord = {
  attendees: string | null;
  minutes: string | null;
  decisions: string | null;
  result: string | null;
  action_summary: string | null;
} | null;

/**
 * The execution form lives in the agenda server view. This small client bridge
 * restores a saved draft when the analyst returns to the same activity without
 * replacing anything the person has already typed in the current screen.
 */
export function SgstiExecutionPrefill({ record }: { record: ExecutionRecord }) {
  useEffect(() => {
    if (!record) return;
    const values: Record<string, string | null> = {
      attendees: record.attendees,
      minutes: record.minutes,
      decisions: record.decisions,
      actionPlan: record.action_summary,
      resultSummary: record.result,
    };
    for (const [name, value] of Object.entries(values)) {
      if (!value) continue;
      const field = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`);
      if (field && !field.value) field.value = value;
    }
  }, [record]);

  return null;
}
