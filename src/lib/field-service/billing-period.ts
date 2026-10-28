/** Returns the inclusive date range for a YYYY-MM competence without timezone drift. */
export function competenceDateRange(competence: string): string {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(competence);
  if (!match) return competence;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${competence}-01 a ${competence}-${String(lastDay).padStart(2, "0")}`;
}
