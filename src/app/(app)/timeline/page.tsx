import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import {
  getCheckInRespondents,
  getCheckIns,
  getCurrentChild,
  getIepPlan,
  getLogs,
  getMedicationChanges,
  getMedications,
  getMilestones,
  getProviders,
  getSchoolMessages,
  getTherapySessions,
  getToday,
} from "@/lib/data";
import { addDays, eachDay } from "@/lib/dates";
import { formatAverage, plural } from "@/lib/format";
import { summarizeLogs } from "@/lib/insights";
import { intensityLabels, milestoneCategoryLabels, moodLabels, ratingLabel, schoolMessageTypeLabels } from "@/lib/labels";
import type { MilestoneCategory } from "@/lib/types";
import type { TimelineEvent } from "./events";
import { TimelineView } from "./timeline-view";

export const metadata: Metadata = { title: "Timeline · Lanternway" };

const milestoneCategory: Record<MilestoneCategory, TimelineEvent["category"]> = {
  development: "milestone",
  life: "milestone",
  diagnosis: "diagnosis",
  therapy: "therapy",
  school: "school",
  medication: "medication",
};

export default async function TimelinePage() {
  const [child, today] = await Promise.all([getCurrentChild(), getToday()]);
  const monthFrom = addDays(today, -29);
  const weekFrom = addDays(today, -6);

  const [milestones, medications, changes, plan, messages, providers, recentLogs, checkIns, respondents] =
    await Promise.all([
      getMilestones(child.id),
      getMedications(child.id),
      getMedicationChanges(child.id),
      getIepPlan(child.id),
      getSchoolMessages(child.id),
      getProviders(child.id),
      getLogs(child.id, { from: monthFrom, to: today }),
      getCheckIns(child.id, { from: monthFrom, to: today }),
      getCheckInRespondents(child.id),
    ]);
  const sessions = (await Promise.all(providers.map((p) => getTherapySessions(p.id)))).flat();
  const providerById = Object.fromEntries(providers.map((p) => [p.id, p]));
  const medName = (id: string) => medications.find((m) => m.id === id)?.name ?? "Medication";
  const respondentName = (id: string) => respondents.find((r) => r.id === id)?.name ?? "Teacher";

  const events: TimelineEvent[] = [];

  // Life milestones (medication starts come from the medication history instead).
  for (const m of milestones) {
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

  for (const c of changes) {
    const name = medName(c.medicationId);
    events.push({
      id: c.id,
      date: c.date,
      category: "medication",
      level: "major",
      title:
        c.type === "start" ? `Started ${name} ${c.doseMg} mg` : c.type === "stop" ? `Stopped ${name}` : `${name} changed to ${c.doseMg} mg`,
      detail: c.reason,
    });
  }

  if (plan) {
    events.push(
      { id: "iep-review", date: plan.annualReviewDate, category: "school", level: "major", title: "IEP annual review", detail: `${plan.school}` },
      { id: "iep-reeval", date: plan.reevaluationDate, category: "school", level: "major", title: "IEP re-evaluation due", detail: plan.school },
    );
  }

  for (const m of messages) {
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

  for (const s of sessions) {
    const p = providerById[s.providerId];
    const isDoctor = p.type === "psychiatry" || p.type === "pediatrics";
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
    if (l.kind === "win") events.push({ id: l.id, date: l.date, time: l.time, category: "win", level: "daily", title: l.text });
    if (l.kind === "note") events.push({ id: l.id, date: l.date, time: l.time, category: "note", level: "daily", title: l.text });
    if (l.kind === "meltdown") {
      events.push({
        id: l.id,
        date: l.date,
        time: l.time,
        category: "meltdown",
        level: "daily",
        title: `Meltdown · ${l.trigger}`,
        detail: `${ratingLabel(intensityLabels, l.intensity)}, about ${l.durationMinutes} min${l.whatHelped.length ? ` · Helped: ${l.whatHelped.join(", ")}` : ""}`,
      });
    }
  }

  for (const c of checkIns) {
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

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Timeline" description={`${child.firstName}'s journey so far — zoom out to see the whole picture.`} />
      <TimelineView events={events} today={today} birthDate={child.birthDate} />
    </div>
  );
}
