import Link from "next/link";
import { CalendarDays, ChevronRight, Clock, HeartHandshake, Pill, School, Star } from "lucide-react";
import type { Metadata } from "next";
import { LumiTip } from "@/components/lumi-tip";
import { getSignedInUser } from "@/lib/auth/server";
import { SectionHeading } from "@/components/page-header";
import { Stat } from "@/components/stat";
import { Card, CardContent } from "@/components/ui/card";
import {
  getCheckIns,
  getCurrentAccess,
  getCurrentChild,
  getIepPlan,
  getLogs,
  getMedications,
  getProviders,
  getToday,
} from "@/lib/data";
import { addDays, dayOfWeek, daysBetween } from "@lanternway/shared/dates";
import { formatAverage, formatLongWeekday, formatRelativeDays, formatWeekdayDate, plural } from "@lanternway/shared/format";
import { refillDueDate, summarizeCheckIns, summarizeLogs } from "@lanternway/shared/insights";
import { logKindIcons, logKindOrder } from "@/lib/log-icons";
import { appetiteLabels, logKindLabels, moodLabels, ratingLabel } from "@lanternway/shared/labels";
import type { IsoDate, WinLog } from "@lanternway/shared/types";
import { TodayLogged } from "./today-logged";

// Reads the signed-in session, so navigations wait for the server (see app layout).
export const instant = false;

export const metadata: Metadata = { title: "Home · Lanternway" };

type Upcoming = { date: IsoDate; title: string; detail: string; icon: typeof Pill; href: string };

/** Next date (after today) that falls on weekday `dow`. */
function nextWeekday(today: IsoDate, dow: number): IsoDate {
  const diff = (dow - dayOfWeek(today) + 7) % 7 || 7;
  return addDays(today, diff);
}

const weekdayByName: Record<string, number> = { Mondays: 1, Tuesdays: 2, Wednesdays: 3, Thursdays: 4, Fridays: 5 };

export default async function HomePage() {
  const [child, today, user, access] = await Promise.all([getCurrentChild(), getToday(), getSignedInUser(), getCurrentAccess()]);
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
        <p className="text-sm font-semibold text-muted-foreground">Welcome back · {formatLongWeekday(today)}</p>
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Hi {user?.name.split(" ")[0] || "there"}</h1>
      </div>

      {/* Next up: the soonest thing coming, as a warm hero card */}
      {soon[0] && <NextUp item={soon[0]} today={today} />}

      {/* Quick log (not for view-only family members) */}
      <section aria-labelledby="quick-log">
        <SectionHeading id="quick-log">How&apos;s {child.firstName}&apos;s day?</SectionHeading>
        {access.role !== "view" && (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {logKindOrder.map((kind) => {
              const Icon = logKindIcons[kind];
              return (
                <Link
                  key={kind}
                  href={`/log?kind=${kind}`}
                  className="group flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-b from-white/90 to-cream px-2 py-4 text-sm font-bold shadow-soft ring-1 ring-white/70 transition-shadow hover:shadow-lift"
                >
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-butter to-peach shadow-sm">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  {logKindLabels[kind]}
                </Link>
              );
            })}
          </div>
        )}
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

      {weekLogs.length === 0 && access.role === "view" && (
        <LumiTip title={`Welcome, ${child.firstName}!`}>
          <p>As the family logs {child.firstName}&apos;s days, you&apos;ll see how things are going here.</p>
        </LumiTip>
      )}
      {weekLogs.length === 0 && access.role === "log" && (
        <LumiTip title={`Welcome, ${child.firstName}!`}>
          <p>Start small: tap one of the buttons above to log how today went. A few taps a day is plenty.</p>
        </LumiTip>
      )}
      {weekLogs.length === 0 && access.role === "admin" && (
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

/** The soonest upcoming item, styled like an appointment card: warm gradient, date and time in a white box. */
function NextUp({ item, today }: { item: Upcoming; today: IsoDate }) {
  return (
    <section aria-labelledby="next-up">
      <SectionHeading id="next-up">Next up</SectionHeading>
      <Link
        href={item.href}
        className="relative block overflow-hidden rounded-3xl bg-gradient-to-br from-butter via-peach to-[#ffc09f] p-5 shadow-lift transition-shadow hover:shadow-soft"
      >
        <span aria-hidden className="absolute -top-16 -right-10 size-48 rounded-full bg-white/25" />
        <span aria-hidden className="absolute -bottom-20 right-16 size-40 rounded-full bg-white/15" />
        <span className="relative flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/80 shadow-sm">
            <item.icon className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg leading-tight font-extrabold">{item.title}</span>
            {item.detail && <span className="block truncate text-sm font-semibold">{item.detail}</span>}
          </span>
          <ChevronRight className="size-5 shrink-0" aria-hidden />
        </span>
        <span className="relative mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-2xl bg-white/90 px-4 py-3 text-sm font-semibold shadow-sm">
          <span className="flex items-center gap-2">
            <CalendarDays className="size-4" aria-hidden />
            {formatWeekdayDate(item.date)}
          </span>
          <span className="flex items-center gap-2">
            <Clock className="size-4" aria-hidden />
            {formatRelativeDays(item.date, today)}
          </span>
        </span>
      </Link>
    </section>
  );
}
