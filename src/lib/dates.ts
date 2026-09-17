/* ── Date helpers ──────────────────────────────────────────────────────────
   Everything here works in the viewer's LOCAL time, deliberately.

   A watch at 11pm on the 20th belongs on the 20th in the viewer's calendar
   and in the 23:00 slot of their viewing clock. `toISOString()` would move
   both to UTC and silently shift them by a day and several hours for most of
   the world — so it appears nowhere in this file, and shouldn't appear in
   anything that buckets watch events. */

/** Local calendar day as "YYYY-MM-DD". */
export function dayKey(ts: number | Date): string {
  const d = ts instanceof Date ? ts : new Date(ts);
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Local hour, 0–23. */
export function localHour(ts: number): number {
  return new Date(ts).getHours();
}

/** Local weekday, 0 = Sunday. */
export function localWeekday(ts: number): number {
  return new Date(ts).getDay();
}

export function startOfDay(ts: number): Date {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, n: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + n);
  return next;
}

/** Sunday of the week containing `date`, at local midnight. */
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date.getTime());
  return addDays(d, -d.getDay());
}

/** Whole local days between two timestamps — safe across DST, unlike /86400000. */
export function daysBetween(a: number, b: number): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000);
}

export const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export const WEEKDAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

/** "9 PM" — the viewing clock's axis labels. */
export function hourLabel(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${hour < 12 ? "AM" : "PM"}`;
}
