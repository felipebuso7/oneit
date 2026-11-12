import { z } from "zod";

export const reviewPageSize = 50;
export function reviewPageNumber(value?: string): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 100000 ? parsed : 1;
}
export function reviewOrderId(value?: string): string | null {
  return value && z.uuid().safeParse(value).success ? value : null;
}
export function reviewHref(orderId?: string | null): string {
  return orderId ? `/portal/review?order=${encodeURIComponent(orderId)}` : "/portal/review";
}
