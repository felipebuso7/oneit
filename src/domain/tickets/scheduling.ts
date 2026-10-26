export function toScheduleTimestamp(date: string, time: string): string {
  const timestamp = new Date(`${date}T${time}`);
  if (Number.isNaN(timestamp.getTime())) throw new Error("Invalid schedule date or time.");
  return timestamp.toISOString();
}
