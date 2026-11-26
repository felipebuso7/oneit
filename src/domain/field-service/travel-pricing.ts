export type ReturnMode = "NONE" | "ESTIMATED_RETURN" | "ACTUAL_RETURN";
export type TravelPricingRule = {
  mode: "INCLUDED" | "NON_BILLABLE" | "FIXED" | "PER_KM";
  returnMode: ReturnMode;
  fixedAmount?: number | null;
  ratePerKm?: number | null;
  franchiseKm?: number | null;
  minAmount?: number | null;
  maxAmount?: number | null;
};

export type TravelPrice = {
  distanceOneWayKm: number;
  returnKm: number;
  consideredKm: number;
  billableKm: number;
  amount: number;
  status: "CALCULATED" | "NOT_BILLABLE" | "PENDING_RULE";
};

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const nonNegative = (value: number | null | undefined) => Math.max(0, Number(value ?? 0));

export function priceTravel(distanceOneWayKm: number, rule: TravelPricingRule | null, actualReturnKm?: number | null): TravelPrice {
  const oneWay = Math.max(0, Number(distanceOneWayKm) || 0);
  if (!rule || rule.mode === "INCLUDED" || rule.mode === "NON_BILLABLE") return { distanceOneWayKm: oneWay, returnKm: 0, consideredKm: oneWay, billableKm: 0, amount: 0, status: rule ? "NOT_BILLABLE" : "PENDING_RULE" };
  const returnKm = rule.returnMode === "NONE" ? 0 : rule.returnMode === "ACTUAL_RETURN" ? nonNegative(actualReturnKm) : oneWay;
  const consideredKm = oneWay + returnKm;
  if (rule.mode === "FIXED") return { distanceOneWayKm: oneWay, returnKm, consideredKm, billableKm: consideredKm, amount: money(Math.min(nonNegative(rule.maxAmount) || Number.POSITIVE_INFINITY, Math.max(nonNegative(rule.minAmount), nonNegative(rule.fixedAmount))),), status: "CALCULATED" };
  const billableKm = Math.max(0, consideredKm - nonNegative(rule.franchiseKm));
  const raw = billableKm * nonNegative(rule.ratePerKm);
  const amount = money(Math.min(nonNegative(rule.maxAmount) || Number.POSITIVE_INFINITY, Math.max(nonNegative(rule.minAmount), raw)));
  return { distanceOneWayKm: oneWay, returnKm, consideredKm, billableKm, amount, status: "CALCULATED" };
}
