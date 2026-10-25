import Image from "next/image";
import { TrendCharts, type TrendEvent, type TrendPoint } from "@/components/charts/trend-charts";
import { DISCLAIMER } from "@/components/disclaimer";
import { brandImages } from "@/lib/brand";
import {
  getAccommodations,
  getCheckIns,
  getCurrentChild,
  getIepGoals,
  getIepPlan,
  getLogs,
  getMedicationChanges,
  getMedications,
  getProviders,
  getSchoolMessages,
  getTherapyGoals,
  getTherapySessions,
} from "@/lib/data";
import { addDays, ageOn, daysBetween } from "@/lib/dates";
import { formatAverage, formatDate, formatShortDate, plural } from "@/lib/format";
import {
  changeLabel,
  compareAround,
  describeComparison,
  rollingAverage,
  summarizeCheckIns,
  summarizeLogs,
  weekStart,
  weeklySeries,
} from "@/lib/insights";
import { communicationStyleLabels, providerTypeLabels, schoolMessageTypeLabels } from "@/lib/labels";
import type { IsoDate, WinLog } from "@/lib/types";
import { reportTypes, type ReportType } from "../report-types";

const titles: Record<ReportType, string> = {
  doctor: "Doctor visit summary",
  iep: "IEP meeting summary",
  therapist: "Therapy summary",
};

export async function Report({
  type,
  from,
  to,
  today,
}: {
  type: ReportType;
  from: IsoDate;
  to: IsoDate;
  today: IsoDate;
}) {
  const child = await getCurrentChild();
  const days = daysBetween(from, to) + 1;
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(from, -days);

  const [logs, prevLogs, checkIns, prevCheckIns, medications, changes, providers, plan, messages] =
    await Promise.all([
      getLogs(child.id, { from, to }),
      getLogs(child.id, { from: prevFrom, to: prevTo }),
      getCheckIns(child.id, { from, to }),
      getCheckIns(child.id, { from: prevFrom, to: prevTo }),
      getMedications(child.id),
      getMedicationChanges(child.id),
      getProviders(child.id),
      getIepPlan(child.id),
      getSchoolMessages(child.id, { from, to }),
    ]);

  const now = summarizeLogs(logs, days);
  const before = summarizeLogs(prevLogs, days);
  const teacher = summarizeCheckIns(checkIns);
  const teacherBefore = summarizeCheckIns(prevCheckIns);
  const medName = (id: string) => medications.find((m) => m.id === id)?.name ?? "Medication";
  const changesInRange = changes.filter((c) => c.date >= from && c.date <= to);
  const wins = logs.filter((l): l is WinLog => l.kind === "win");

  // Factual one-liners at the top of every report.
  const insights: string[] = [];
  if (type === "doctor") {
    if (changesInRange.length === 0) insights.push("No medication changes in this period.");
    for (const c of changesInRange) {
      // Compare across the whole record so "before" isn't cut off by the report start.
      const allLogs = await getLogs(child.id, { from: addDays(c.date, -42), to: addDays(c.date, 41) });
      const allCheckIns = await getCheckIns(child.id, { from: addDays(c.date, -42), to: addDays(c.date, 41) });
      insights.push(describeComparison(compareAround(c.date, allLogs, allCheckIns, today), changeLabel(c, medName(c.medicationId))));
    }
  }
  if (teacher.focus != null) {
    insights.push(
      `Teacher focus ratings averaged ${formatAverage(teacher.focus)} out of 5 across ${plural(teacher.count, "check-in")}` +
        (teacherBefore.focus != null ? ` (previous ${days} days: ${formatAverage(teacherBefore.focus)}).` : "."),
    );
  }
  if (now.sleepHours != null) {
    insights.push(
      `Sleep averaged ${formatAverage(now.sleepHours)} hours a night with ${formatAverage(now.nightWakings)} wake-ups` +
        (before.sleepHours != null ? ` (previous: ${formatAverage(before.sleepHours)} hours).` : "."),
    );
  }
  insights.push(
    `${plural(now.meltdowns, "meltdown")} logged, about ${now.meltdownsPerWeek.toFixed(1)} a week (previous: ${before.meltdownsPerWeek.toFixed(1)} a week)` +
      (now.topTriggers.length ? `. Most often after: ${now.topTriggers.map((t) => t.label.toLowerCase()).join(", ")}.` : "."),
  );
  insights.push(`${plural(wins.length, "win")} recorded.`);

  const summaryRows = [
    { label: "Mood (1–5)", now: now.mood, before: before.mood },
    { label: "Sleep (hours)", now: now.sleepHours, before: before.sleepHours },
    { label: "Wake-ups a night", now: now.nightWakings, before: before.nightWakings },
    { label: "Appetite (1–5)", now: now.appetite, before: before.appetite },
    { label: "Meltdowns a week", now: now.meltdownsPerWeek, before: before.meltdownsPerWeek },
    { label: "Teacher focus (1–5)", now: teacher.focus, before: teacherBefore.focus },
    { label: "Teacher-rated mood (1–5)", now: teacher.mood, before: teacherBefore.mood },
  ];

  // Weekly chart data for the range.
  const weekly = weeklySeries(logs, checkIns, from, to);
  const focus = rollingAverage(weekly.map((w) => w.focus), 4);
  const mainMed = medications[0];
  const doseOn = (date: IsoDate) =>
    changes.filter((c) => c.medicationId === mainMed?.id && c.date <= date).at(-1)?.doseMg ?? null;
  const series: TrendPoint[] = weekly.map((w, i) => ({
    week: w.week,
    dose: doseOn(addDays(w.week, 6)),
    focus: focus[i],
    sleepHours: w.sleepHours,
    mood: w.mood,
  }));
  const events: TrendEvent[] = changesInRange.map((c, i) => ({
    week: weekStart(c.date),
    n: i + 1,
    label: `${formatDate(c.date)}: ${changeLabel(c, medName(c.medicationId))}`,
  }));
  const showCharts = days >= 28;

  const { logoLockup } = brandImages;

  return (
    <article className="space-y-8 rounded-2xl bg-white/70 p-5 text-teal ring-1 ring-border md:p-8 print:rounded-none print:bg-white print:p-0 print:ring-0">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
        <div>
          <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
            {reportTypes.find((t) => t.value === type)?.title} report
          </p>
          <h1 className="text-2xl font-extrabold">{titles[type]}: {child.firstName}</h1>
          <p className="text-sm text-muted-foreground">
            Born {formatDate(child.birthDate)} (age {ageOn(child.birthDate, today)}) ·{" "}
            {child.diagnoses.map((d) => d.name).join(", ")}
          </p>
          <p className="mt-1 text-sm font-semibold">
            {formatDate(from)} – {formatDate(to)} ({days} days)
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <Image {...logoLockup} alt={logoLockup.alt} className="mb-1 ml-auto h-auto w-28" />
          Prepared {formatDate(today)} by Dana (parent)
        </div>
      </header>

      <Section title="At a glance">
        <ul className="list-disc space-y-1.5 pl-5">
          {insights.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </Section>

      {type === "doctor" && (
        <Section title="Medications">
          <ul className="space-y-1">
            {medications.map((m) => {
              const latest = changes.filter((c) => c.medicationId === m.id && c.date <= to).at(-1);
              return (
                <li key={m.id}>
                  <span className="font-semibold">{m.name}</span> — {latest?.doseMg} mg, {latest?.schedule.toLowerCase()} · since{" "}
                  {formatDate(m.startDate)}
                </li>
              );
            })}
          </ul>
          {changesInRange.length > 0 && (
            <Table
              head={["Date", "Change", "Reason (as recorded)", "Noticed afterward"]}
              rows={changesInRange.map((c) => [
                formatDate(c.date),
                c.type === "start" ? `Started ${medName(c.medicationId)} ${c.doseMg} mg` : `${medName(c.medicationId)} → ${c.doseMg} mg`,
                c.reason,
                c.sideEffectsObserved.join("; ") || "—",
              ])}
            />
          )}
        </Section>
      )}

      <Section title={`This period vs. the ${days} days before`}>
        <Table
          head={["Measure", `${formatShortDate(from)} – ${formatShortDate(to)}`, "Previous period"]}
          rows={summaryRows.map((r) => [r.label, formatAverage(r.now), formatAverage(r.before)])}
          numeric
        />
      </Section>

      {showCharts && (
        <Section title="Week by week">
          <TrendCharts
            data={series}
            events={events}
            panels={type === "doctor" ? ["dose", "focus", "sleepHours"] : type === "iep" ? ["focus", "mood"] : ["mood", "sleepHours"]}
            titles={{ dose: mainMed ? `${mainMed.name} dose` : "Dose", mood: "Mood at home" }}
            syncId={`report-${type}`}
          />
        </Section>
      )}

      {(type === "doctor" || type === "therapist") && now.meltdowns > 0 && (
        <Section title="Meltdowns">
          <p>
            {plural(now.meltdowns, "meltdown")}, typically about {formatAverage(now.meltdownMinutes, 0)} minutes.
          </p>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="font-bold">Most common triggers</h3>
              <ul className="list-disc pl-5">
                {now.topTriggers.map((t) => (
                  <li key={t.label}>{t.label} ({t.count})</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-bold">What helped most</h3>
              <ul className="list-disc pl-5">
                {now.topHelpers.map((t) => (
                  <li key={t.label}>{t.label} ({t.count})</li>
                ))}
              </ul>
            </div>
          </div>
        </Section>
      )}

      {type === "iep" && plan && <IepSections planId={plan.id} from={from} to={to} plan={plan} />}

      {type === "iep" && messages.length > 0 && (
        <Section title="Contact with school">
          <Table
            head={["Date", "Type", "With", "Summary"]}
            rows={messages.map((m) => [formatDate(m.date), schoolMessageTypeLabels[m.type], m.person, `${m.subject}: ${m.summary}`])}
          />
        </Section>
      )}

      {type === "therapist" && (
        <>
          <Section title="Communication">
            <p>
              <span className="font-semibold">{communicationStyleLabels[child.communicationStyle]}.</span>{" "}
              {child.communicationNotes}
            </p>
          </Section>
          <TherapySections providers={providers.filter((p) => !p.endDate && p.type !== "psychiatry" && p.type !== "pediatrics")} from={from} to={to} />
        </>
      )}

      {wins.length > 0 && (
        <Section title="Recent wins">
          <ul className="list-disc space-y-1 pl-5">
            {[...wins].reverse().slice(0, 8).map((w) => (
              <li key={w.id}>
                {w.text} <span className="text-muted-foreground">({formatShortDate(w.date)})</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <footer className="border-t pt-4 text-sm">
        <p className="font-semibold">{DISCLAIMER}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Prepared from records kept by {child.firstName}&apos;s family, including teacher check-ins. Averages describe what was logged and may
          have gaps.
        </p>
      </footer>
    </article>
  );
}

async function IepSections({
  planId,
  plan,
  from,
  to,
}: {
  planId: string;
  plan: NonNullable<Awaited<ReturnType<typeof getIepPlan>>>;
  from: IsoDate;
  to: IsoDate;
}) {
  const [goals, supports] = await Promise.all([getIepGoals(planId), getAccommodations(planId)]);
  const services = supports.filter((s) => s.kind === "service");
  const accommodationIssues = supports
    .filter((s) => s.kind === "accommodation")
    .flatMap((a) => a.deliveryLog.filter((l) => l.status !== "delivered" && l.date >= from && l.date <= to).map((l) => ({ a, l })));

  return (
    <>
      <Section title="Plan">
        <p>
          {plan.school} · {plan.type.toUpperCase()} started {formatDate(plan.startDate)} · annual review{" "}
          <strong>{formatDate(plan.annualReviewDate)}</strong> · re-evaluation due {formatDate(plan.reevaluationDate)} · case
          manager {plan.caseManager}
        </p>
      </Section>
      <Section title="Goal progress (from school progress reports)">
        <Table
          head={["Goal", "Baseline", "Latest", "Target"]}
          rows={goals.map((g) => {
            const latest = g.progress.filter((p) => p.date <= to).at(-1);
            return [
              g.area,
              g.baseline,
              latest ? `${latest.value}${g.unit.startsWith("%") ? "%" : ` ${g.unit}`} (${formatShortDate(latest.date)})${latest.value >= g.targetValue ? " — target reached" : ""}` : "—",
              g.target,
            ];
          })}
        />
      </Section>
      <Section title="Services delivered">
        <Table
          head={["Service", "Required", "Fully delivered", "Not fully delivered"]}
          rows={services.map((s) => {
            const weeks = s.deliveryLog.filter((l) => l.date >= from && l.date <= to);
            const issues = weeks.filter((l) => l.status !== "delivered");
            return [
              s.title,
              s.frequency ?? "",
              `${weeks.length - issues.length} of ${weeks.length} weeks`,
              issues.length ? issues.map((l) => `${formatShortDate(l.date)}${l.note ? ` (${l.note})` : ""}`).join("; ") : "—",
            ];
          })}
        />
      </Section>
      {accommodationIssues.length > 0 && (
        <Section title="Accommodations not fully provided">
          <ul className="list-disc space-y-1 pl-5">
            {accommodationIssues.map(({ a, l }) => (
              <li key={`${a.id}-${l.date}`}>
                <span className="font-semibold">{formatDate(l.date)} · {a.title}:</span> {l.note}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}

async function TherapySections({
  providers,
  from,
  to,
}: {
  providers: Awaited<ReturnType<typeof getProviders>>;
  from: IsoDate;
  to: IsoDate;
}) {
  const details = await Promise.all(
    providers.map(async (p) => ({
      p,
      goals: await getTherapyGoals(p.id),
      sessions: await getTherapySessions(p.id, { from, to }),
    })),
  );
  return (
    <>
      {details.map(({ p, goals, sessions }) => (
        <Section key={p.id} title={`${providerTypeLabels[p.type]} · ${p.name}`}>
          <p className="mb-2">{plural(sessions.length, "session")} in this period.</p>
          <Table
            head={["Goal", "Status", "Progress"]}
            rows={goals.map((g) => {
              const latest = g.progress.filter((x) => x.date <= to).at(-1);
              return [g.title, g.status === "met" ? "Met" : g.status === "active" ? "Working on it" : g.status, latest ? `${latest.percent}%` : "—"];
            })}
          />
          {sessions.some((s) => s.practiceAtHome) && (
            <p className="mt-2 text-sm">
              <span className="font-semibold">Practicing at home: </span>
              {[...new Set(sessions.map((s) => s.practiceAtHome).filter(Boolean))].join(" · ")}
            </p>
          )}
        </Section>
      ))}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <h2 className="mb-2 text-lg font-extrabold">{title}</h2>
      <div className="text-sm">{children}</div>
    </section>
  );
}

function Table({ head, rows, numeric }: { head: string[]; rows: string[][]; numeric?: boolean }) {
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            {head.map((h, i) => (
              <th key={h} scope="col" className={`py-1.5 pr-3 font-semibold ${numeric && i > 0 ? "text-right" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-b align-top last:border-0">
              {r.map((cell, i) => (
                <td key={i} className={`py-1.5 pr-3 ${numeric && i > 0 ? "text-right tabular-nums" : ""} ${i === 0 ? "font-semibold" : ""}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
