import { addDays, dayOfWeek, parseIsoDate } from "./dates";
import { formatTime } from "./format";
import { refillDueDate } from "./insights";
import { providerTypeLabels } from "./labels";
import type { IsoDate, Medication, MedicationChange, MedicationReminder, Provider, ReminderDays, TherapySession } from "./types";

// Helpers for things that repeat: weekly therapy appointments (read from the
// care team's plain-English schedule), medication reminder days, and the month
// calendar of medications and therapy (website and phone).

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

/** One-line summary of a reminder, e.g. "7:15 AM · Every day · Push notification". */
export function reminderSummary(r: MedicationReminder): string {
  return [
    r.times.map(formatTime).join(", "),
    reminderDaysLabels[r.days],
    r.channel === "push" ? "Push notification" : "Text message",
    r.status === "paused" ? "Paused" : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

/** "Started Focalin 5 mg", "Stopped Focalin", "Focalin changed to 10 mg". */
export function describeMedicationChange(c: Pick<MedicationChange, "type" | "doseMg">, name: string): string {
  if (c.type === "start") return `Started ${name} ${c.doseMg} mg`;
  if (c.type === "stop") return `Stopped ${name}`;
  return `${name} changed to ${c.doseMg} mg`;
}

// ---- The care calendar ----

export type CalendarSession = Pick<TherapySession, "id" | "providerId" | "date" | "durationMinutes" | "summary">;

export type CalendarLayer = "meds" | "therapy";

export type CalendarItem = {
  id: string;
  layer: CalendarLayer;
  /** "dose" = scheduled that day; "event" = change or refill; "session" = logged; "planned" = from the schedule. */
  type: "dose" | "event" | "session" | "planned";
  title: string;
  detail?: string;
  time?: string;
};

export const isVisit = (p?: Pick<Provider, "type">) => p?.type === "psychiatry" || p?.type === "pediatrics";

/**
 * Returns a function listing what's on the calendar for a date: the dose taken that
 * day with its reminder times, dose changes, refills due, logged sessions, and
 * upcoming weekly appointments read from the care team's schedules.
 */
export function calendarItems({
  today,
  medications,
  changes,
  reminders,
  providers,
  sessions,
}: {
  today: IsoDate;
  medications: Medication[];
  changes: MedicationChange[];
  reminders: MedicationReminder[];
  providers: Provider[];
  sessions: CalendarSession[];
}): (date: IsoDate) => CalendarItem[] {
  const historyOf = (id: string) => changes.filter((c) => c.medicationId === id).sort((a, b) => a.date.localeCompare(b.date));
  const schedules = providers.map((p) => ({ p, weekly: parseWeeklySchedule(p.schedule) }));
  const teamById = new Map(providers.map((p) => [p.id, p]));

  return (date) => {
    const out: CalendarItem[] = [];

    for (const m of medications) {
      const history = historyOf(m.id);
      const latest = history.filter((c) => c.date <= date).at(-1);
      const active = m.startDate <= date && (!m.stopDate || date <= m.stopDate) && latest && latest.type !== "stop";
      if (active) {
        const times = reminders
          .filter((r) => r.medicationId === m.id && reminderOn(r, date) && (!m.stopDate || date <= m.stopDate))
          .flatMap((r) => r.times)
          .sort();
        out.push({
          id: `dose-${m.id}`,
          layer: "meds",
          type: "dose",
          title: `${m.name} ${latest.doseMg} mg`,
          detail: [latest.schedule, times.length ? `Reminder ${times.map(formatTime).join(", ")}` : ""].filter(Boolean).join(" · "),
          time: times[0],
        });
      }
      for (const c of history.filter((c) => c.date === date)) {
        out.push({
          id: c.id,
          layer: "meds",
          type: "event",
          title: c.type === "start" ? `Started ${m.name}` : describeMedicationChange(c, m.name),
          detail: c.reason || undefined,
        });
      }
      const due = !m.stopDate ? refillDueDate(m.lastFilledOn, m.daysSupply) : null;
      if (due === date) {
        out.push({ id: `refill-${m.id}`, layer: "meds", type: "event", title: `${m.name} refill due`, detail: m.pharmacy });
      }
    }

    const logged = sessions.filter((s) => s.date === date && teamById.has(s.providerId));
    for (const s of logged) {
      const p = teamById.get(s.providerId)!;
      out.push({
        id: s.id,
        layer: "therapy",
        type: "session",
        title: isVisit(p) ? `Visit with ${p.name}` : `${providerTypeLabels[p.type]} with ${p.name}`,
        detail: [s.durationMinutes ? `${s.durationMinutes} min` : "", s.summary ?? ""].filter(Boolean).join(" · "),
      });
    }
    if (date >= today) {
      for (const { p, weekly } of schedules) {
        if (!weekly || !weekly.weekdays.includes(dayOfWeek(date))) continue;
        if (date < p.startDate || (p.endDate && date > p.endDate)) continue;
        if (logged.some((s) => s.providerId === p.id)) continue;
        out.push({
          id: `plan-${p.id}-${date}`,
          layer: "therapy",
          type: "planned",
          title: `${providerTypeLabels[p.type]} with ${p.name}`,
          detail: `Usual time${weekly.time ? ` ${formatTime(weekly.time)}` : ""} · from the care team schedule`,
          time: weekly.time,
        });
      }
    }
    return out.sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99"));
  };
}

/** The weeks of a month grid ("YYYY-MM"), Sunday first, including days from the months around it. */
export function monthWeeks(month: string): IsoDate[][] {
  const first = `${month}-01`;
  const gridStart = addDays(first, -dayOfWeek(first));
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  return [0, 1, 2, 3, 4, 5].map((w) => days.slice(w * 7, w * 7 + 7)).filter((w) => w.some((d) => d.startsWith(month)));
}

/** The month ("YYYY-MM") n months from this one. */
export function shiftMonth(month: string, n: number): string {
  const d = parseIsoDate(`${month}-01`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
}

/** For a screen reader: "2 medications, 1 change or refill". */
export function describeCalendarCounts(items: CalendarItem[]): string {
  const count = (type: CalendarItem["type"]) => items.filter((i) => i.type === type).length;
  const [doses, events, logged, planned] = [count("dose"), count("event"), count("session"), count("planned")];
  const parts = [
    doses && `${doses} medication${doses === 1 ? "" : "s"}`,
    events && `${events} change${events === 1 ? "" : "s"} or refill${events === 1 ? "" : "s"}`,
    logged && `${logged} session${logged === 1 ? "" : "s"} logged`,
    planned && `${planned} usual appointment${planned === 1 ? "" : "s"}`,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "nothing recorded";
}
