/**
 * Summaries of what was recorded: averages, counts, before/after comparisons.
 *
 * These describe the record only. They never interpret, diagnose, or suggest
 * anything — wording stays factual ("averaged 3.5, was 1.9").
 */

import { addDays, dayOfWeek, daysBetween } from "@/lib/dates";
import { formatShortDate } from "@/lib/format";
import type {
  AppetiteLog,
  CheckIn,
  IsoDate,
  LogEntry,
  MeltdownLog,
  MedicationChange,
  MoodLog,
  SleepLog,
} from "@/lib/types";

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

const round1 = (v: number | null) => (v == null ? null : Math.round(v * 10) / 10);

function countTop(values: string[], limit: number) {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

export type LogSummary = {
  days: number;
  /** How many log entries this summary is based on (0 means nothing was recorded). */
  entries: number;
  mood: number | null;
  sleepHours: number | null;
  nightWakings: number | null;
  appetite: number | null;
  meltdowns: number;
  meltdownsPerWeek: number;
  meltdownMinutes: number | null;
  wins: number;
  topTriggers: { label: string; count: number }[];
  topHelpers: { label: string; count: number }[];
};

/** Summarize logs that fall in a window of `days` days. */
export function summarizeLogs(logs: LogEntry[], days: number): LogSummary {
  const of = <K extends LogEntry["kind"]>(kind: K) =>
    logs.filter((l): l is Extract<LogEntry, { kind: K }> => l.kind === kind);
  const sleep = of("sleep") as SleepLog[];
  const meltdowns = of("meltdown") as MeltdownLog[];
  return {
    days,
    entries: logs.length,
    mood: round1(average((of("mood") as MoodLog[]).map((l) => l.rating))),
    sleepHours: round1(average(sleep.map((l) => l.hours))),
    nightWakings: round1(average(sleep.map((l) => l.nightWakings))),
    appetite: round1(average((of("appetite") as AppetiteLog[]).map((l) => l.rating))),
    meltdowns: meltdowns.length,
    meltdownsPerWeek: Math.round((meltdowns.length / Math.max(1, days)) * 7 * 10) / 10,
    meltdownMinutes: round1(average(meltdowns.map((m) => m.durationMinutes))),
    wins: of("win").length,
    topTriggers: countTop(meltdowns.map((m) => m.trigger), 3),
    topHelpers: countTop(meltdowns.flatMap((m) => m.whatHelped), 3),
  };
}

export type CheckInSummary = {
  count: number;
  focus: number | null;
  mood: number | null;
  behavior: number | null;
  participation: number | null;
};

export function summarizeCheckIns(checkIns: CheckIn[]): CheckInSummary {
  const avg = (key: keyof CheckIn["ratings"]) => round1(average(checkIns.map((c) => c.ratings[key])));
  return {
    count: checkIns.length,
    focus: avg("focus"),
    mood: avg("mood"),
    behavior: avg("behavior"),
    participation: avg("participation"),
  };
}

/** Monday of the week containing `date`. */
export function weekStart(date: IsoDate): IsoDate {
  return addDays(date, -((dayOfWeek(date) + 6) % 7));
}

export type WeeklyPoint = {
  week: IsoDate;
  /** Teacher focus rating average (classroom + special ed). Null outside school. */
  focus: number | null;
  sleepHours: number | null;
  mood: number | null;
  appetite: number | null;
  meltdowns: number;
};

/** One point per week from `from` to `to`, for charts. */
export function weeklySeries(
  logs: LogEntry[],
  checkIns: CheckIn[],
  from: IsoDate,
  to: IsoDate,
): WeeklyPoint[] {
  const buckets = new Map<IsoDate, { logs: LogEntry[]; checkIns: CheckIn[] }>();
  for (let w = weekStart(from); w <= to; w = addDays(w, 7)) {
    buckets.set(w, { logs: [], checkIns: [] });
  }
  for (const l of logs) buckets.get(weekStart(l.date))?.logs.push(l);
  for (const c of checkIns) buckets.get(weekStart(c.date))?.checkIns.push(c);

  return [...buckets.entries()].map(([week, b]) => {
    const s = summarizeLogs(b.logs, 7);
    return {
      week,
      focus: summarizeCheckIns(b.checkIns).focus,
      sleepHours: s.sleepHours,
      mood: s.mood,
      appetite: s.appetite,
      meltdowns: s.meltdowns,
    };
  });
}

export type Comparison = {
  date: IsoDate;
  windowDays: number;
  before: { logs: LogSummary; checkIns: CheckInSummary };
  after: { logs: LogSummary; checkIns: CheckInSummary };
};

/**
 * Compare the `windowDays` before a date with the `windowDays` from that
 * date on (or up to `today`, if sooner). School breaks are skipped
 * naturally because there are no check-ins then.
 */
export function compareAround(
  date: IsoDate,
  logs: LogEntry[],
  checkIns: CheckIn[],
  today: IsoDate,
  windowDays = 42,
): Comparison {
  const beforeFrom = addDays(date, -windowDays);
  const afterTo = [addDays(date, windowDays - 1), today].sort()[0];
  const inWindow = <T extends { date: IsoDate }>(items: T[], from: IsoDate, to: IsoDate) =>
    items.filter((i) => i.date >= from && i.date <= to);
  const beforeTo = addDays(date, -1);
  return {
    date,
    windowDays,
    before: {
      logs: summarizeLogs(inWindow(logs, beforeFrom, beforeTo), windowDays),
      checkIns: summarizeCheckIns(inWindow(checkIns, beforeFrom, beforeTo)),
    },
    after: {
      logs: summarizeLogs(inWindow(logs, date, afterTo), daysBetween(date, afterTo) + 1),
      checkIns: summarizeCheckIns(inWindow(checkIns, date, afterTo)),
    },
  };
}

function change(label: string, after: number | null, before: number | null, unit = "") {
  if (after == null || before == null) return null;
  return `${label} averaged ${after.toFixed(1)}${unit} (was ${before.toFixed(1)}${unit})`;
}

/**
 * One-sentence factual summary of a comparison, e.g.
 * "Since the dose change on Mar 3, teacher focus ratings averaged 3.5 (was 1.9); …"
 */
export function describeComparison(c: Comparison, eventLabel: string): string {
  const parts = [
    change("teacher focus ratings", c.after.checkIns.focus, c.before.checkIns.focus),
    change("sleep", c.after.logs.sleepHours, c.before.logs.sleepHours, " hrs"),
    change("appetite", c.after.logs.appetite, c.before.logs.appetite),
    change("mood", c.after.logs.mood, c.before.logs.mood),
  ].filter(Boolean);
  // Only compare meltdowns when something was logged on both sides; no records isn't "zero meltdowns".
  if (c.before.logs.entries > 0 && c.after.logs.entries > 0) {
    parts.push(`meltdowns ${c.after.logs.meltdownsPerWeek.toFixed(1)}/week (was ${c.before.logs.meltdownsPerWeek.toFixed(1)})`);
  }
  if (parts.length === 0) {
    return `Not enough was recorded before and after the ${eventLabel} on ${formatShortDate(c.date)} to compare yet.`;
  }
  return `Since the ${eventLabel} on ${formatShortDate(c.date)}, ${parts.join("; ")}.`;
}

/** Short label for a medication change, e.g. "dose change", "start of Guanfacine ER". */
export function changeLabel(change: MedicationChange, medicationName: string): string {
  if (change.type === "start") return `start of ${medicationName}`;
  if (change.type === "stop") return `stop of ${medicationName}`;
  return `${medicationName} dose change`;
}

/** Date a refill is due, from the last fill and days of supply. */
export function refillDueDate(lastFilledOn?: IsoDate, daysSupply?: number): IsoDate | null {
  if (!lastFilledOn || !daysSupply) return null;
  return addDays(lastFilledOn, daysSupply);
}

/**
 * Rolling average over the last `size` points, skipping empty weeks.
 * Short gaps (up to `bridge` empty weeks between values, e.g. a missed
 * check-in) are filled from the window; longer gaps like school breaks stay empty.
 */
export function rollingAverage(values: (number | null)[], size: number, bridge = 2): (number | null)[] {
  const fillable = values.map((v, i) => {
    if (v != null) return true;
    let before = i;
    while (before >= 0 && values[before] == null) before--;
    let after = i;
    while (after < values.length && values[after] == null) after++;
    const gap = after - before - 1;
    return before >= 0 && after < values.length && gap <= bridge;
  });
  return values.map((_, i) => {
    if (!fillable[i]) return null;
    const window = values.slice(Math.max(0, i - size + 1), i + 1).filter((x): x is number => x != null);
    return round1(average(window));
  });
}
