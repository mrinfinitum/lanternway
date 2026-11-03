/**
 * The lifelong timeline, shared by the website and the phone: which records become
 * rows, what each row says, and how the rows are grouped at each zoom level.
 */

import { addDays, ageOn, eachDay } from "./dates";
import { formatAverage, formatMonthYear, formatWeekdayDate, plural } from "./format";
import { summarizeLogs } from "./insights";
import { intensityLabels, milestoneCategoryLabels, moodLabels, ratingLabel, schoolMessageTypeLabels } from "./labels";
import { describeMedicationChange, isVisit } from "./schedule";
import type {
  CheckIn,
  CheckInRespondent,
  IepPlan,
  IsoDate,
  LogEntry,
  Medication,
  MedicationChange,
  Milestone,
  MilestoneCategory,
  Provider,
  SchoolMessage,
  TherapySession,
} from "./types";

/** One row on the timeline. Plain data so it can go to the browser. */
export type TimelineEvent = {
  id: string;
  date: IsoDate;
  time?: string;
  category:
    | "diagnosis"
    | "medication"
    | "school"
    | "therapy"
    | "milestone"
    | "win"
    | "meltdown"
    | "check-in"
    | "note"
    | "visit"
    | "day";
  /**
   * major = shown at every zoom level; minor = year and closer;
   * daily = month and closer; summary = week only.
   */
  level: "major" | "minor" | "daily" | "summary";
  title: string;
  detail?: string;
};

export type Zoom = "week" | "month" | "year" | "all";

export const zoomLevels: Record<Zoom, TimelineEvent["level"][]> = {
  week: ["major", "minor", "daily", "summary"],
  month: ["major", "minor", "daily"],
  year: ["major", "minor"],
  all: ["major"],
};

export const zoomOptions: { value: Zoom; label: string; days?: number }[] = [
  { value: "week", label: "Week", days: 7 },
  { value: "month", label: "Month", days: 30 },
  { value: "year", label: "Year", days: 365 },
  { value: "all", label: "All" },
];

const milestoneCategory: Record<MilestoneCategory, TimelineEvent["category"]> = {
  development: "milestone",
  life: "milestone",
  diagnosis: "diagnosis",
  therapy: "therapy",
  school: "school",
  medication: "medication",
};

export type TimelineRecords = {
  today: IsoDate;
  milestones: Milestone[];
  medications: Medication[];
  medicationChanges: MedicationChange[];
  iepPlan: IepPlan | null;
  schoolMessages: SchoolMessage[];
  providers: Provider[];
  sessions: TherapySession[];
  /** At least the last month. */
  logs: LogEntry[];
  /** At least the last month. */
  checkIns: CheckIn[];
  respondents: CheckInRespondent[];
};

/** A timeline row for a win, note or meltdown log; null for the other kinds. */
export function logEvent(l: LogEntry): TimelineEvent | null {
  if (l.kind === "win") return { id: l.id, date: l.date, time: l.time, category: "win", level: "daily", title: l.text };
  if (l.kind === "note") return { id: l.id, date: l.date, time: l.time, category: "note", level: "daily", title: l.text };
  if (l.kind === "meltdown") {
    return {
      id: l.id,
      date: l.date,
      time: l.time,
      category: "meltdown",
      level: "daily",
      title: `Meltdown · ${l.trigger}`,
      detail: `${ratingLabel(intensityLabels, l.intensity)}, about ${l.durationMinutes} min${l.whatHelped.length ? ` · Helped: ${l.whatHelped.join(", ")}` : ""}`,
    };
  }
  return null;
}

/** Every timeline row from the child's records. Day-to-day rows cover the last month; day summaries the last week. */
export function timelineEvents(r: TimelineRecords): TimelineEvent[] {
  const { today } = r;
  const monthFrom = addDays(today, -29);
  const weekFrom = addDays(today, -6);
  const providerById = Object.fromEntries(r.providers.map((p) => [p.id, p]));
  const medName = (id: string) => r.medications.find((m) => m.id === id)?.name ?? "Medication";
  const respondentName = (id: string) => r.respondents.find((x) => x.id === id)?.name ?? "Teacher";
  const recentLogs = r.logs.filter((l) => l.date >= monthFrom && l.date <= today);

  const events: TimelineEvent[] = [];

  // Life milestones (medication starts come from the medication history instead).
  for (const m of r.milestones) {
    if (m.category === "medication") continue;
    events.push({
      id: m.id,
      date: m.date,
      category: milestoneCategory[m.category],
      level: "major",
      title: m.title,
      detail: m.description ?? milestoneCategoryLabels[m.category],
    });
  }

  for (const c of r.medicationChanges) {
    events.push({ id: c.id, date: c.date, category: "medication", level: "major", title: describeMedicationChange(c, medName(c.medicationId)), detail: c.reason });
  }

  if (r.iepPlan) {
    const plan = r.iepPlan;
    events.push(
      { id: "iep-review", date: plan.annualReviewDate, category: "school", level: "major", title: "IEP annual review", detail: `${plan.school}` },
      { id: "iep-reeval", date: plan.reevaluationDate, category: "school", level: "major", title: "IEP re-evaluation due", detail: plan.school },
    );
  }

  for (const m of r.schoolMessages) {
    // IEP meetings are already milestones.
    if (m.type === "meeting" && m.subject.startsWith("Annual IEP")) continue;
    events.push({
      id: m.id,
      date: m.date,
      category: "school",
      level: "minor",
      title: m.subject,
      detail: `${schoolMessageTypeLabels[m.type]} · ${m.person}`,
    });
  }

  for (const s of r.sessions) {
    const p = providerById[s.providerId];
    if (!p) continue;
    const isDoctor = isVisit(p);
    if (!isDoctor && s.date < monthFrom) continue;
    events.push({
      id: s.id,
      date: s.date,
      category: isDoctor ? "visit" : "therapy",
      level: isDoctor ? "minor" : "daily",
      title: isDoctor ? `Visit with ${p.name}` : `${p.type === "ot" ? "OT" : p.type === "speech" ? "Speech" : "ABA"} with ${p.name.split(" ")[0]}`,
      detail: s.summary,
    });
  }

  for (const l of recentLogs) {
    const e = logEvent(l);
    if (e) events.push(e);
  }

  for (const c of r.checkIns) {
    if (c.date < monthFrom) continue;
    events.push({
      id: c.id,
      date: c.date,
      category: "check-in",
      level: "daily",
      title: `Check-in from ${respondentName(c.respondentId)}`,
      detail: `Focus ${c.ratings.focus} · Mood ${c.ratings.mood} · Behavior ${c.ratings.behavior} · Participation ${c.ratings.participation}${c.note ? ` — “${c.note}”` : ""}`,
    });
  }

  // A one-line summary for each day of the last week.
  for (const day of eachDay(weekFrom, today)) {
    const s = summarizeLogs(recentLogs.filter((l) => l.date === day), 1);
    const parts = [
      s.mood != null && `Mood: ${ratingLabel(moodLabels, Math.round(s.mood))}`,
      s.sleepHours != null && `Sleep: ${formatAverage(s.sleepHours)} hrs`,
      s.meltdowns > 0 && plural(s.meltdowns, "meltdown"),
    ].filter(Boolean);
    if (parts.length) {
      events.push({ id: `day-${day}`, date: day, time: "00:00", category: "day", level: "summary", title: parts.join(" · ") });
    }
  }

  return events;
}

export type TimelineGroup = { key: string; label: string; items: TimelineEvent[] };

/**
 * What a zoom level shows: the rows in its period, newest first, grouped by day
 * (week, month), by month (year) or by year with the child's age (all); plus the
 * major rows still to come.
 */
export function timelineView(events: TimelineEvent[], zoom: Zoom, today: IsoDate, birthDate: IsoDate) {
  const option = zoomOptions.find((o) => o.value === zoom)!;
  const from = option.days ? addDays(today, -(option.days - 1)) : "0000-01-01";
  const levels = zoomLevels[zoom];

  const visible = events
    .filter((e) => levels.includes(e.level) && e.date >= from && e.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.time ?? "99").localeCompare(a.time ?? "99"));
  const upcoming = events.filter((e) => e.level === "major" && e.date > today).sort((a, b) => a.date.localeCompare(b.date));

  const groupKey = (e: TimelineEvent) => (zoom === "all" ? e.date.slice(0, 4) : zoom === "year" ? e.date.slice(0, 7) : e.date);
  const groupLabel = (key: string) => {
    if (zoom === "all") {
      const age = ageOn(birthDate, `${key}-12-31`);
      return age === 0 ? `${key} · age 0` : `${key} · age ${age - 1}–${age}`;
    }
    if (zoom === "year") return formatMonthYear(`${key}-01`);
    return key === today ? "Today" : formatWeekdayDate(key);
  };
  const groups: TimelineGroup[] = [];
  for (const e of visible) {
    const key = groupKey(e);
    const last = groups.at(-1);
    if (last?.key === key) last.items.push(e);
    else groups.push({ key, label: groupLabel(key), items: [e] });
  }
  return { upcoming, groups };
}
