import type { DateRange, IsoDate } from "@/lib/types";

// Date-only helpers. All math is done in UTC so "YYYY-MM-DD" strings never
// shift by a day because of the viewer's time zone.

const DAY_MS = 24 * 60 * 60 * 1000;

export function parseIsoDate(date: IsoDate): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function toIsoDate(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return toIsoDate(new Date(parseIsoDate(date).getTime() + days * DAY_MS));
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) / DAY_MS);
}

/** 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(date: IsoDate): number {
  return parseIsoDate(date).getUTCDay();
}

export function isInRange(date: IsoDate, range: DateRange = {}): boolean {
  // ISO date strings sort correctly as plain strings.
  const day = date.slice(0, 10);
  if (range.from && day < range.from) return false;
  if (range.to && day > range.to) return false;
  return true;
}

/** Every date from `from` to `to`, inclusive. */
export function eachDay(from: IsoDate, to: IsoDate): IsoDate[] {
  const days: IsoDate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  return days;
}

/** Whole years between a birth date and `on`. */
export function ageOn(birthDate: IsoDate, on: IsoDate): number {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [y, m, d] = on.split("-").map(Number);
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}

/** Cookie with the family's time zone (set by <TimeZoneCookie />). */
export const TIME_ZONE_COOKIE = "lw-tz";
const DEFAULT_TIME_ZONE = "America/New_York";

/** Today's date in a time zone (falls back to US Eastern if it's missing or unknown). */
export function todayIn(timeZone: string | undefined, now: Date = new Date()): IsoDate {
  const format = (tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  try {
    return format(timeZone || DEFAULT_TIME_ZONE);
  } catch {
    return format(DEFAULT_TIME_ZONE);
  }
}
