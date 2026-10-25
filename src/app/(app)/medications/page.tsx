import type { Metadata } from "next";
import { TrendCharts, type TrendEvent, type TrendPoint } from "@/components/charts/trend-charts";
import { Disclaimer } from "@/components/disclaimer";
import { PageHeader, SectionHeading } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  getCheckIns,
  getCurrentChild,
  getLogs,
  getMedicationChanges,
  getMedications,
  getProviders,
  getToday,
} from "@/lib/data";
import { addDays } from "@/lib/dates";
import { formatAverage, formatDate, formatMonthYear } from "@/lib/format";
import {
  changeLabel,
  compareAround,
  describeComparison,
  rollingAverage,
  weekStart,
  weeklySeries,
  type Comparison,
} from "@/lib/insights";
import type { MedicationChange } from "@/lib/types";
import { MedicationManager } from "./medication-manager";

export const metadata: Metadata = { title: "Medications · Lanternway" };

export default async function MedicationsPage() {
  const [child, today] = await Promise.all([getCurrentChild(), getToday()]);
  const from = addDays(today, -728);
  const [medications, changes, logs, checkIns, providers] = await Promise.all([
    getMedications(child.id),
    getMedicationChanges(child.id),
    getLogs(child.id, { from, to: today }),
    getCheckIns(child.id, { from, to: today }),
    getProviders(child.id),
  ]);

  const manager = (
    <MedicationManager
      key={child.id}
      childId={child.id}
      childName={child.firstName}
      today={today}
      medications={medications}
      changes={changes}
      providers={providers}
    />
  );

  if (medications.length === 0) {
    return (
      <div className="space-y-10">
        <PageHeader title="Medications" description="What's been prescribed, when it changed, and how days looked around each change." />
        {manager}
        <Disclaimer />
      </div>
    );
  }

  const medName = (id: string) => medications.find((m) => m.id === id)?.name ?? "Medication";

  // Chart data: weekly averages plus the main medication's dose that week.
  const main = medications[0];
  const mainChanges = changes.filter((c) => c.medicationId === main.id);
  const doseOn = (date: string) =>
    mainChanges.filter((c) => c.date <= date).at(-1)?.doseMg ?? null;
  const weekly = weeklySeries(logs, checkIns, from, today);
  const focus4 = rollingAverage(weekly.map((p) => p.focus), 4);
  const series: TrendPoint[] = weekly.map((p, i) => ({
    week: p.week,
    dose: doseOn(addDays(p.week, 6)),
    focus: focus4[i],
    sleepHours: p.sleepHours,
  }));

  const inRange = changes.filter((c) => c.date >= from);
  const numbered = inRange.map((c, i) => ({ change: c, n: i + 1 }));
  const events: TrendEvent[] = numbered.map(({ change, n }) => ({
    week: weekStart(change.date),
    n,
    label: describeChange(change, medName(change.medicationId)),
  }));
  const comparisons = numbered.map(({ change, n }) => ({
    change,
    n,
    comparison: compareAround(change.date, logs, checkIns, today),
  }));

  // Monthly table view of the charted numbers.
  const monthly = new Map<string, TrendPoint[]>();
  for (const p of series) {
    const key = p.week.slice(0, 7);
    monthly.set(key, [...(monthly.get(key) ?? []), p]);
  }
  const avg = (values: (number | null | undefined)[]) => {
    const nums = values.filter((v): v is number => typeof v === "number");
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
  };

  return (
    <div className="space-y-10">
      <PageHeader
        title="Medications"
        description="What's been prescribed, when it changed, and how home and school days looked around each change."
      />

      {manager}

      <section aria-labelledby="chart-heading">
        <SectionHeading id="chart-heading">The last two years</SectionHeading>
        <Card>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Numbered lines mark medication changes. Teacher ratings come from weekly check-ins, so there are gaps
              over school breaks.
            </p>
            <TrendCharts
              data={series}
              events={events}
              panels={["dose", "focus", "sleepHours"]}
              titles={{ dose: `${main.name} dose` }}
            />
            <ol className="space-y-1 text-sm">
              {events.map((e) => (
                <li key={e.n} className="flex gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-coral/30 text-xs font-extrabold">
                    {e.n}
                  </span>
                  {e.label}
                </li>
              ))}
            </ol>
            <details className="rounded-xl bg-white px-4 py-3 text-sm">
              <summary className="cursor-pointer font-bold">See the numbers as a table</summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left tabular-nums">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="py-1 pr-4 font-semibold">Month</th>
                      <th className="py-1 pr-4 font-semibold">Dose (mg)</th>
                      <th className="py-1 pr-4 font-semibold">Teacher focus</th>
                      <th className="py-1 font-semibold">Sleep (hrs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...monthly.entries()].map(([month, points]) => (
                      <tr key={month} className="border-t">
                        <td className="py-1 pr-4">{formatMonthYear(`${month}-01`)}</td>
                        <td className="py-1 pr-4">{formatAverage(avg(points.map((p) => p.dose)), 0)}</td>
                        <td className="py-1 pr-4">{formatAverage(avg(points.map((p) => p.focus)))}</td>
                        <td className="py-1">{formatAverage(avg(points.map((p) => p.sleepHours)))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="changes-heading">
        <SectionHeading id="changes-heading">Changes and what was recorded around them</SectionHeading>
        <div className="space-y-4">
          {[...comparisons].reverse().map(({ change, n, comparison }) => (
            <ChangeCard
              key={change.id}
              n={n}
              change={change}
              medicationName={medName(change.medicationId)}
              comparison={comparison}
            />
          ))}
        </div>
        <EarlierChanges changes={changes.filter((c) => c.date < from)} medName={medName} />
      </section>

      <Disclaimer />
    </div>
  );
}

function describeChange(change: MedicationChange, name: string) {
  if (change.type === "start") return `${formatDate(change.date)}: started ${name} ${change.doseMg} mg`;
  if (change.type === "stop") return `${formatDate(change.date)}: stopped ${name}`;
  return `${formatDate(change.date)}: ${name} changed to ${change.doseMg} mg`;
}

function ChangeCard({
  n,
  change,
  medicationName,
  comparison,
}: {
  n: number;
  change: MedicationChange;
  medicationName: string;
  comparison: Comparison;
}) {
  const { before, after } = comparison;
  const rows = [
    { label: "Teacher focus", before: before.checkIns.focus, after: after.checkIns.focus, unit: "/ 5" },
    { label: "Sleep", before: before.logs.sleepHours, after: after.logs.sleepHours, unit: "hrs" },
    { label: "Appetite", before: before.logs.appetite, after: after.logs.appetite, unit: "/ 5" },
    { label: "Mood", before: before.logs.mood, after: after.logs.mood, unit: "/ 5" },
    { label: "Meltdowns", before: before.logs.meltdownsPerWeek, after: after.logs.meltdownsPerWeek, unit: "/ week" },
  ];

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-coral/30 text-xs font-extrabold">
            {n}
          </span>
          <h3 className="font-extrabold">{describeChange(change, medicationName)}</h3>
          <Badge variant="secondary" className="bg-white">
            {change.schedule}
          </Badge>
        </div>
        <p className="text-sm">
          <span className="font-semibold">Why: </span>
          {change.reason}
        </p>
        {change.sideEffectsObserved.length > 0 && (
          <p className="text-sm">
            <span className="font-semibold">Noticed afterward: </span>
            {change.sideEffectsObserved.join("; ")}
          </p>
        )}
        {change.notes && <p className="text-sm text-muted-foreground">{change.notes}</p>}

        <div className="overflow-x-auto rounded-xl bg-white p-3">
          <table className="w-full text-sm tabular-nums">
            <caption className="mb-2 text-left text-xs font-semibold text-muted-foreground">
              {comparison.windowDays / 7} weeks before vs. after
            </caption>
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="pb-1 font-semibold" scope="col">Measure</th>
                <th className="pb-1 text-right font-semibold" scope="col">Before</th>
                <th className="pb-1 text-right font-semibold" scope="col">After</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-t">
                  <th scope="row" className="py-1.5 text-left font-semibold">{r.label}</th>
                  <td className="py-1.5 text-right">{formatAverage(r.before)} <span className="text-xs text-muted-foreground">{r.unit}</span></td>
                  <td className="py-1.5 text-right font-bold">{formatAverage(r.after)} <span className="text-xs font-normal text-muted-foreground">{r.unit}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground">{describeComparison(comparison, changeLabel(change, medicationName))}</p>
      </CardContent>
    </Card>
  );
}

function EarlierChanges({
  changes,
  medName,
}: {
  changes: MedicationChange[];
  medName: (id: string) => string;
}) {
  if (changes.length === 0) return null;
  return (
    <div className="mt-6">
      <h3 className="mb-2 font-bold">Earlier</h3>
      <ul className="space-y-2 text-sm">
        {changes.map((c) => (
          <li key={c.id} className="rounded-xl border px-3 py-2">
            <span className="font-semibold">{describeChange(c, medName(c.medicationId))}</span>
            <span className="block text-muted-foreground">{c.reason}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
