export type SgstiPeriodicity = "ONCE" | "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "ANNUAL" | "CUSTOM";

function daysInUtcMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function addUtcMonths(date: Date, months: number) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const normalizedYear = year + Math.floor(month / 12);
  const normalizedMonth = ((month % 12) + 12) % 12;
  return new Date(Date.UTC(
    normalizedYear,
    normalizedMonth,
    Math.min(date.getUTCDate(), daysInUtcMonth(normalizedYear, normalizedMonth)),
  ));
}

/**
 * Calculates the next planned date without mutating the input. Calendar periods
 * preserve the intended day of month whenever it exists (e.g. 31 Jan -> 28 Feb).
 */
export function nextSgstiOccurrence(
  plannedAt: Date,
  periodicity: SgstiPeriodicity,
  customIntervalDays?: number | null,
) {
  if (periodicity === "ONCE") return null;
  if (periodicity === "MONTHLY") return addUtcMonths(plannedAt, 1);
  if (periodicity === "QUARTERLY") return addUtcMonths(plannedAt, 3);
  if (periodicity === "SEMIANNUAL") return addUtcMonths(plannedAt, 6);
  if (periodicity === "ANNUAL") return addUtcMonths(plannedAt, 12);
  if (!Number.isInteger(customIntervalDays) || !customIntervalDays || customIntervalDays < 1) {
    throw new Error("CUSTOM_INTERVAL_REQUIRED");
  }
  return new Date(plannedAt.getTime() + customIntervalDays * 86_400_000);
}

/** Returns unique notification dates in ascending order, including the due date. */
export function sgstiReminderDates(dueAt: Date, reminderDays: readonly number[] = [15, 3, 0]) {
  const values = new Set<number>();
  for (const days of reminderDays) {
    if (Number.isInteger(days) && days >= 0) values.add(dueAt.getTime() - days * 86_400_000);
  }
  values.add(dueAt.getTime());
  return [...values].sort((left, right) => left - right).map((value) => new Date(value));
}
