/** Unidades padronizadas usadas pela LPU e pelos documentos de medição. */
export const LPU_UNITS = [
  "unidade",
  "peça",
  "metro",
  "centímetro",
  "hora",
  "visita",
  "quilômetro",
] as const;

export type LpuUnit = (typeof LPU_UNITS)[number];

export function isLpuUnit(value: string): value is LpuUnit {
  return (LPU_UNITS as readonly string[]).includes(value);
}
