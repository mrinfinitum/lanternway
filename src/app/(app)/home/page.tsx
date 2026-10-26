import Link from "next/link";
import { ChevronRight, HeartHandshake, Pill, School, Star } from "lucide-react";
import type { Metadata } from "next";
import { LumiTip } from "@/components/lumi-tip";
import { getSignedInUser } from "@/lib/auth/server";
import { SectionHeading } from "@/components/page-header";
import { Stat } from "@/components/stat";
import { Card, CardContent } from "@/components/ui/card";
import {
  getCheckIns,
  getCurrentChild,
  getIepPlan,
  getLogs,
  getMedications,
  getProviders,
  getToday,
} from "@/lib/data";
import { addDays, dayOfWeek, daysBetween } from "@/lib/dates";
import { formatAverage, formatLongWeekday, formatRelativeDays, formatWeekdayDate, plural } from "@/lib/format";
import { refillDueDate, summarizeCheckIns, summarizeLogs } from "@/lib/insights";
import { logKindIcons, logKindOrder } from "@/lib/log-icons";
import { appetiteLabels, logKindLabels, moodLabels, ratingLabel } from "@/lib/labels";
import type { IsoDate, WinLog } from "@/lib/types";
import { TodayLogged } from "./today-logged";

export const metadata: Metadata = { title: "Home · Lanternway" };

type Upcoming = { date: IsoDate; title: string; detail: string; icon: typeof Pill; href: string };

/** Next date (after today) that falls on weekday `dow`. */
function nextWeekday(today: IsoDate, dow: number): IsoDate {
  const diff = (dow - dayOfWeek(today) + 7) % 7 || 7;
  return addDays(today, diff);
}

const weekdayByName: Record<string, number> = { Mondays: 1, Tuesdays: 2, Wednesdays: 3, Thursdays: 4, Fridays: 5 };

export default async function HomePage() {
  const [child, today, user] = await Promise.all([getCurrentChild(), getToday(), getSignedInUser()]);
  const weekFrom = addDays(today, -6);
  const [weekLogs, todayLogs, checkIns, plan, medications, providers] = await Promise.all([
    getLogs(child.id, { from: weekFrom, to: today }),
    getLogs(child.id, { from: today, to: today }),
    getCheckIns(child.id, { from: addDays(today, -13), to: today }),
    getIepPlan(child.id),
    getMedications(child.id),
    getProviders(child.id, { includePast: false }),
  ]);

  const week = summarizeLogs(weekLogs, 7);
  const teacher = summarizeCheckIns(checkIns);
  const wins = weekLogs.filter((l): l is WinLog => l.kind === "win").reverse();

  // Coming up in the next 30 days.
  const upcoming: Upcoming[] = [];
  if (plan) {
    upcoming.push({
      date: plan.annualReviewDate,
      title: "IEP annual review",
      detail: `${plan.school} · with ${plan.caseManager}`,
      icon: School,
      href: "/school",
    });
  }
  for (const med of medications) {
    const due = refillDueDate(med.lastFilledOn, med.daysSupply);
    if (due) {
      upcoming.push({ date: due, title: `${med.name} refill`, detail: med.pharmacy ?? "", icon: Pill, href: "/medications" });
    }
  }
  for (const p of providers) {
    const day = p.schedule?.split(" ")[0];
    if (day && weekdayByName[day]) {
      upcoming.push({
        date: nextWeekday(today, weekdayByName[day]),
        title: `${p.name.split(" ")[0]} · ${p.type === "ot" ? "OT" : "Speech"}`,
        detail: p.schedule ?? "",
        icon: HeartHandshake,
        href: `/therapy/${p.id}`,
      });
    }
  }
  const soon = upcoming
    .filter((u) => u.date >= today && daysBetween(today, u.date) <= 30)
    .sort((a, b) => a.date.localeCompare(b.date));
  const iepDays = plan ? daysBetween(today, plan.annualReviewDate) : null;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-muted-foreground">{formatLongWeekday(today)}</p>
        <h1 className="text-2xl font-extrabold md:text-3xl">Hi {user?.name.split(" ")[0] || "there"}</h1>
      </div>

      {/* Quick log */}
      <section aria-labelledby="quick-log">
        <SectionHeading id="quick-log">How&apos;s {child.firstName}&apos;s day?</SectionHeading>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {logKindOrder.map((kind) => {
            const Icon = logKindIcons[kind];
            return (
              <Link
                key={kind}
                href={`/log?kind=${kind}`}
                className="flex flex-col items-center gap-2 rounded-2xl bg-cream px-2 py-4 text-sm font-bold transition-colors hover:bg-amber/30"
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-white">
                  <Icon className="size-5" aria-hidden />
                </span>
                {logKindLabels[kind]}
              </Link>
            );
          })}
        </div>
        <TodayLogged childId={child.id} today={today} serverLogs={todayLogs} />
      </section>

      {/* This week */}
      <section aria-labelledby="this-week">
        <SectionHeading
          id="this-week"
          action={
            <Link href="/timeline" className="text-sm font-semibold underline-offset-4 hover:underline">
              See timeline
            </Link>
          }
        >
          This week
        </SectionHeading>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat
            label="Mood"
            value={formatAverage(week.mood)}
            unit="/ 5"
            hint={week.mood ? `Mostly “${ratingLabel(moodLabels, Math.round(week.mood))}”` : "Nothing logged yet"}
          />
          <Stat
            label="Sleep"
            value={formatAverage(week.sleepHours)}
            unit="hrs"
            hint={week.nightWakings != null ? `${formatAverage(week.nightWakings)} wake-ups a night` : undefined}
          />
          <Stat
            label="Teacher focus"
            value={formatAverage(teacher.focus)}
            unit={teacher.count > 0 ? "/ 5" : undefined}
            hint={teacher.count > 0 ? `From ${plural(teacher.count, "check-in")}, last 2 weeks` : "No teacher check-ins yet"}
          />
          <Stat
            label="Meltdowns"
            value={week.meltdowns}
            hint={week.appetite ? `Appetite: ${ratingLabel(appetiteLabels, Math.round(week.appetite)).toLowerCase()}` : undefined}
          />
        </div>
      </section>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Coming up */}
        <section aria-labelledby="coming-up">
          <SectionHeading id="coming-up">Coming up</SectionHeading>
          <Card className="py-2">
            <CardContent className="divide-y">
              {soon.length === 0 && <p className="py-3 text-muted-foreground">Nothing in the next 30 days.</p>}
              {soon.map((u) => (
                <Link key={`${u.title}-${u.date}`} href={u.href} className="flex items-center gap-3 py-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white">
                    <u.icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{u.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {formatWeekdayDate(u.date)} · {formatRelativeDays(u.date, today)}
                    </span>
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                </Link>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* Wins */}
        <section aria-labelledby="wins">
          <SectionHeading id="wins">Wins this week</SectionHeading>
          <Card className="py-2">
            <CardContent className="divide-y">
              {wins.length === 0 && <p className="py-3 text-muted-foreground">No wins logged yet this week.</p>}
              {wins.slice(0, 4).map((w) => (
                <div key={w.id} className="flex items-start gap-3 py-3">
                  <Star className="mt-0.5 size-4 shrink-0 fill-amber text-amber" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block">{w.text}</span>
                    <span className="block text-xs text-muted-foreground">{formatWeekdayDate(w.date)}</span>
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>

      {weekLogs.length === 0 && (
        <LumiTip title={`Welcome, ${child.firstName}!`}>
          <p>
            Start small: tap one of the buttons above to log how today went. A few taps a day is plenty, and{" "}
            <Link href="/about-me" className="font-bold underline underline-offset-4">
              {child.firstName}&apos;s About Me
            </Link>{" "}
            is ready to fill in whenever you have a minute.
          </p>
        </LumiTip>
      )}

      {iepDays != null && iepDays >= 0 && iepDays <= 45 && (
        <LumiTip>
          <p>
            {child.firstName}&apos;s IEP review is {formatRelativeDays(plan!.annualReviewDate, today)}. An{" "}
            <Link href="/reports?type=iep" className="font-bold underline underline-offset-4">
              IEP meeting report
            </Link>{" "}
            pulls together goal progress, services, and teacher check-ins in one place.
          </p>
        </LumiTip>
      )}
    </div>
  );
}
