import type { TicketImpact } from "@/lib/validation/ticket";

const score: Record<TicketImpact, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };

export function derivePriority(impact: TicketImpact, urgency: TicketImpact): number {
  const total = score[impact] + score[urgency];
  if (total >= 6) return 1;
  if (total === 5) return 2;
  if (total === 4) return 3;
  if (total === 3) return 4;
  return 5;
}
