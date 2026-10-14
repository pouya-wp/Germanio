/**
 * Learner-local "day". Brain runs on the learner's own machine, so the system
 * time zone is the learner's. Like Anki, the day rolls over at 04:00 so a
 * late-night session still counts for the day it belongs to.
 */
export const DAY_ROLLOVER_HOUR = 4;

const pad = (n: number) => String(n).padStart(2, '0');

export function learnerDay(at: Date = new Date()): string {
  const d = new Date(at.getTime());
  if (d.getHours() < DAY_ROLLOVER_HOUR) d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** ISO bounds [start, end) of the learner day containing `at`. */
export function learnerDayBounds(at: Date = new Date()): { start: string; end: string } {
  const [y, m, d] = learnerDay(at).split('-').map(Number) as [number, number, number];
  const start = new Date(y, m - 1, d, DAY_ROLLOVER_HOUR);
  const end = new Date(y, m - 1, d + 1, DAY_ROLLOVER_HOUR);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}
