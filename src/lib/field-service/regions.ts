export const FIELD_REGIONS = [
  "Grande SP",
  "Região Metropolitana",
  "Litoral Norte",
  "Litoral Sul",
  "Interior até 50 km",
  "Interior até 100 km",
  "Interior acima de 100 km",
] as const;

export type FieldRegion = (typeof FIELD_REGIONS)[number];
