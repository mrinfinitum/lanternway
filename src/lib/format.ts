import { daysBetween, parseIsoDate } from "@/lib/dates";
import type { IsoDate } from "@/lib/types";

// All formatting uses UTC so date-only strings render as the same day everywhere.

const fmt = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...options });

const longDate = fmt({ month: "short", day: "numeric", year: "numeric" });
const shortDate = fmt({ month: "short", day: "numeric" });
const weekdayDate = fmt({ weekday: "short", month: "short", day: "numeric" });
const weekdayLong = fmt({ weekday: "long", month: "long", day: "numeric" });
const monthYear = fmt({ month: "long", year: "numeric" });
const shortMonthYear = fmt({ month: "short", year: "2-digit" });

/** "Oct 21, 2026" */
export const formatDate = (date: IsoDate) => longDate.format(parseIsoDate(date));
/** "Oct 21" */
export const formatShortDate = (date: IsoDate) => shortDate.format(parseIsoDate(date));
/** "Wed, Oct 21" */
export const formatWeekdayDate = (date: IsoDate) => weekdayDate.format(parseIsoDate(date));
/** "Wednesday, October 21" */
export const formatLongWeekday = (date: IsoDate) => weekdayLong.format(parseIsoDate(date));
/** "October 2026" */
export const formatMonthYear = (date: IsoDate) => monthYear.format(parseIsoDate(date));
/** "Oct 26" — compact chart axis label */
export const formatAxisMonth = (date: IsoDate) => shortMonthYear.format(parseIsoDate(date));

/** "today", "tomorrow", "in 5 days", "yesterday", "3 days ago" */
export function formatRelativeDays(date: IsoDate, today: IsoDate): string {
  const days = daysBetween(today, date);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days > 0) return `in ${days} days`;
  return `${-days} days ago`;
}

/** "21:45" → "9:45pm" */
export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")}${suffix}`;
}

/** One decimal place, or an en dash when there's no data. */
export function formatAverage(value: number | null | undefined, digits = 1): string {
  return value == null || Number.isNaN(value) ? "–" : value.toFixed(digits);
}

export function plural(count: number, word: string, pluralWord = `${word}s`): string {
  return `${count} ${count === 1 ? word : pluralWord}`;
}
