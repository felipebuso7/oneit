export function billingTotalsMatch(expected: number, lineTotals: number[], tolerance = 0.01): boolean {
  if (!Number.isFinite(expected) || lineTotals.some((value) => !Number.isFinite(value))) return false;
  const calculated = lineTotals.reduce((sum, value) => sum + value, 0);
  return Math.abs(Math.round((calculated - expected) * 100)) <= Math.round(tolerance * 100);
}
