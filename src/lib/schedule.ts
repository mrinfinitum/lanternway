import { dayOfWeek } from "@/lib/dates";
import type { IsoDate, MedicationReminder, ReminderDays } from "@/lib/types";

// Helpers for things that repeat: weekly therapy appointments (read from the
// care team's plain-English schedule) and medication reminder days.

const WEEKDAYS: [RegExp, number][] = [
  [/\bsun(day)?s?\b/i, 0],
  [/\bmon(day)?s?\b/i, 1],
  [/\btue(s(day)?)?s?\b/i, 2],
  [/\bwed(nesday)?s?\b/i, 3],
  [/\bthu(r(s(day)?)?)?s?\b/i, 4],
  [/\bfri(day)?s?\b/i, 5],
  [/\bsat(urday)?s?\b/i, 6],
];

export type WeeklySchedule = { weekdays: number[]; time?: string };

/**
 * Reads weekdays and a time from a schedule like "Tuesdays 4:00pm, weekly" or
 * "Mondays & Thursdays 3:30pm". Null when there's no weekday in it (e.g.
 * "Every 3 months"), so we never guess an appointment that isn't there.
 */
export function parseWeeklySchedule(text: string | undefined): WeeklySchedule | null {
  if (!text || /\b(every other|biweekly|monthly|every \d+ (weeks|months))\b/i.test(text)) return null;
  const weekdays = WEEKDAYS.filter(([re]) => re.test(text)).map(([, d]) => d);
  if (weekdays.length === 0) return null;
  const m = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)/i);
  let time: string | undefined;
  if (m) {
    let h = Number(m[1]) % 12;
    if (m[3].toLowerCase().startsWith("p")) h += 12;
    time = `${String(h).padStart(2, "0")}:${m[2] ?? "00"}`;
  }
  return { weekdays, time };
}

export const reminderDaysLabels: Record<ReminderDays, string> = {
  "every-day": "Every day",
  weekdays: "Weekdays",
  weekends: "Weekends",
};

/** True if a reminder repeats on this date. */
export function reminderOn(reminder: MedicationReminder, date: IsoDate): boolean {
  if (reminder.status !== "active") return false;
  const dow = dayOfWeek(date);
  if (reminder.days === "weekdays") return dow >= 1 && dow <= 5;
  if (reminder.days === "weekends") return dow === 0 || dow === 6;
  return true;
}

/** What a reminder will say. Private by default: no medication name. */
export function reminderMessage(childName: string, time: string, medName: string, wording: MedicationReminder["wording"]): string {
  const [h, m] = time.split(":").map(Number);
  const clock = `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  return wording === "named" ? `Lanternway: time for ${childName}'s ${medName} (${clock}).` : `Lanternway: ${childName}'s ${clock} reminder.`;
}
