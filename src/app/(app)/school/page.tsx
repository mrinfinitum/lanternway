import type { Metadata } from "next";
import { CalendarClock, CircleAlert, CircleCheck, CircleMinus, Paperclip, Users } from "lucide-react";
import { EmptyState } from "@/components/lumi-tip";
import { PageHeader, SectionHeading } from "@/components/page-header";
import { Stat } from "@/components/stat";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getAccommodations,
  getCheckInLinks,
  getCheckInRespondents,
  getCheckIns,
  getCurrentChild,
  getIepGoals,
  getIepPlan,
  getSchoolMessages,
  getToday,
} from "@/lib/data";
import { addDays } from "@/lib/dates";
import { formatAverage, formatDate, formatRelativeDays, formatShortDate, plural } from "@/lib/format";
import { summarizeCheckIns } from "@/lib/insights";
import { deliveryStatusLabels, respondentRoleLabels, schoolMessageTypeLabels } from "@/lib/labels";
import type { Accommodation, DeliveryStatus, IepGoal } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CheckInLinks } from "./check-in-links";

export const metadata: Metadata = { title: "School · Lanternway" };

export default async function SchoolPage() {
  const [child, today] = await Promise.all([getCurrentChild(), getToday()]);
  const plan = await getIepPlan(child.id);
  if (!plan) {
    return (
      <div>
        <PageHeader title="School" />
        <EmptyState>
          <p className="font-bold text-teal">No IEP or 504 plan for {child.firstName} yet.</p>
          <p className="mt-1 text-sm">
            When the school shares a plan, you can follow goal progress, services, and accommodations here.
          </p>
        </EmptyState>
      </div>
    );
  }
  const [goals, supports, messages, respondents, links, recentCheckIns] = await Promise.all([
    getIepGoals(plan.id),
    getAccommodations(plan.id),
    getSchoolMessages(child.id),
    getCheckInRespondents(child.id),
    getCheckInLinks(child.id),
    getCheckIns(child.id, { from: addDays(today, -27), to: today }),
  ]);
  const services = supports.filter((s) => s.kind === "service");
  const accommodations = supports.filter((s) => s.kind === "accommodation");
  const respondentName = (id: string) => respondents.find((r) => r.id === id)?.name ?? "Teacher";
  const teacher = summarizeCheckIns(recentCheckIns);

  return (
    <div className="space-y-6">
      <PageHeader title="School" description={`${plan.school} · ${plan.type.toUpperCase()} · ${plan.grade}`} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat
          label="Annual review"
          value={formatShortDate(plan.annualReviewDate)}
          hint={formatRelativeDays(plan.annualReviewDate, today)}
          className="bg-amber/30"
        />
        <Stat label="Re-evaluation due" value={formatShortDate(plan.reevaluationDate)} hint={plan.reevaluationDate.slice(0, 4)} />
        <Stat label="Plan started" value={formatShortDate(plan.startDate)} hint={plan.startDate.slice(0, 4)} className="col-span-2 md:col-span-1" />
      </div>

      <Tabs defaultValue="goals">
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <TabsList className="h-10 w-max rounded-full bg-cream p-1">
            {[
              ["goals", "Goals"],
              ["supports", "Supports"],
              ["check-ins", "Check-ins"],
              ["messages", "Messages"],
              ["team", "Team"],
            ].map(([value, label]) => (
              <TabsTrigger
                key={value}
                value={value}
                className="rounded-full px-4 font-bold data-active:bg-teal data-active:text-paper"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="goals" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Progress from the school&apos;s progress reports. The marker shows each goal&apos;s target.
          </p>
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} />
          ))}
        </TabsContent>

        <TabsContent value="supports" className="mt-4 space-y-8">
          <section aria-labelledby="services">
            <SectionHeading id="services">Services</SectionHeading>
            <DeliveryLegend />
            <div className="mt-3 space-y-3">
              {services.map((s) => (
                <ServiceCard key={s.id} service={s} />
              ))}
            </div>
          </section>
          <section aria-labelledby="accommodations">
            <SectionHeading id="accommodations">Accommodations</SectionHeading>
            <div className="space-y-3">
              {accommodations.map((a) => (
                <AccommodationCard key={a.id} accommodation={a} />
              ))}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="check-ins" className="mt-4 space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Focus" value={formatAverage(teacher.focus)} unit="/ 5" />
            <Stat label="Mood" value={formatAverage(teacher.mood)} unit="/ 5" />
            <Stat label="Behavior" value={formatAverage(teacher.behavior)} unit="/ 5" />
            <Stat label="Participation" value={formatAverage(teacher.participation)} unit="/ 5" />
          </div>
          <p className="-mt-3 text-xs text-muted-foreground">Averages from {plural(teacher.count, "check-in")} in the last 4 weeks.</p>

          <section aria-labelledby="links">
            <SectionHeading id="links">Check-in links</SectionHeading>
            <p className="mb-3 text-sm text-muted-foreground">
              Each link is private to one person and only opens a short form. They never see {child.firstName}&apos;s record.
            </p>
            <CheckInLinks
              today={today}
              links={links.map((l) => {
                const r = respondents.find((x) => x.id === l.respondentId);
                return { ...l, name: r?.name ?? "", role: r ? respondentRoleLabels[r.role] : "" };
              })}
            />
          </section>

          <section aria-labelledby="recent-checkins">
            <SectionHeading id="recent-checkins">Recent check-ins</SectionHeading>
            <ul className="space-y-2">
              {[...recentCheckIns].reverse().map((c) => (
                <li key={c.id} className="rounded-2xl border p-3 text-sm">
                  <p className="flex justify-between gap-2 font-bold">
                    {respondentName(c.respondentId)}
                    <span className="font-normal text-muted-foreground">{formatShortDate(c.date)}</span>
                  </p>
                  <p className="text-muted-foreground">
                    Focus {c.ratings.focus} · Mood {c.ratings.mood} · Behavior {c.ratings.behavior} · Participation {c.ratings.participation}
                  </p>
                  {c.note && <p className="mt-1">“{c.note}”</p>}
                </li>
              ))}
            </ul>
          </section>
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          <ol className="space-y-3">
            {[...messages].reverse().map((m) => (
              <li key={m.id} className="rounded-2xl bg-card ring-1 ring-border p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="bg-white">{schoolMessageTypeLabels[m.type]}</Badge>
                  <span>{formatDate(m.date)}</span>
                  <span>·</span>
                  <span>
                    {m.direction === "to-school" ? "To" : m.direction === "from-school" ? "From" : "With"} {m.person}, {m.role}
                  </span>
                </div>
                <p className="mt-2 font-bold">{m.subject}</p>
                <p className="text-sm">{m.summary}</p>
                {m.attachments.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {m.attachments.map((a) => (
                      <li key={a.name} className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold">
                        <Paperclip className="size-3" aria-hidden /> {a.name}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <Card>
            <CardContent>
              <p className="mb-3 flex items-center gap-2 font-bold">
                <Users className="size-4" aria-hidden /> IEP team · case manager {plan.caseManager}
              </p>
              <ul className="divide-y">
                {plan.team.map((t) => (
                  <li key={t.name} className="py-2">
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {t.role}
                      {t.email && <> · <a href={`mailto:${t.email}`} className="underline-offset-4 hover:underline">{t.email}</a></>}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarClock className="size-4" aria-hidden /> Plan dates come from the IEP document the school shared.
      </p>
    </div>
  );
}

function GoalCard({ goal }: { goal: IepGoal }) {
  const latest = goal.progress.at(-1);
  const pct = latest ? Math.min(100, latest.value) : 0;
  const met = latest != null && latest.value >= goal.targetValue;
  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">{goal.area}</p>
            <p className="mt-1 text-sm">{goal.description}</p>
          </div>
          {met && <Badge className="bg-amber text-teal">Target reached</Badge>}
        </div>
        <div>
          <div className="relative h-3 rounded-full bg-white" role="img" aria-label={`${latest?.value ?? 0} ${goal.unit}, target ${goal.targetValue}`}>
            <div className="h-3 rounded-full bg-amber" style={{ width: `${pct}%` }} />
            <div className="absolute -top-1 h-5 w-0.5 rounded bg-teal" style={{ left: `${goal.targetValue}%` }} aria-hidden />
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>Baseline: {goal.baseline}</span>
            <span>Target: {goal.target}</span>
          </div>
        </div>
        <ol className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          {goal.progress.map((p) => (
            <li key={p.date} className="rounded-xl bg-white px-3 py-2">
              <p className="text-xs text-muted-foreground">{formatShortDate(p.date)}, {p.date.slice(2, 4)}</p>
              <p className="font-extrabold">{p.value}%</p>
              {p.note && <p className="text-xs">{p.note}</p>}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

const statusIcon: Record<DeliveryStatus, typeof CircleCheck> = {
  delivered: CircleCheck,
  partial: CircleMinus,
  missed: CircleAlert,
};

const statusSquare: Record<DeliveryStatus, string> = {
  delivered: "bg-amber",
  partial: "bg-amber/40",
  missed: "bg-white ring-2 ring-inset ring-coral",
};

function DeliveryLegend() {
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {(Object.keys(deliveryStatusLabels) as DeliveryStatus[]).map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <span className={cn("size-3 rounded-sm", statusSquare[s])} aria-hidden />
          {deliveryStatusLabels[s]}
        </span>
      ))}
    </p>
  );
}

function ServiceCard({ service }: { service: Accommodation }) {
  const log = service.deliveryLog;
  const delivered = log.filter((l) => l.status === "delivered").length;
  const issues = log.filter((l) => l.status !== "delivered").reverse();
  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-extrabold">{service.title}</h3>
          <span className="text-sm font-semibold">{service.frequency}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {service.details} {service.provider && `· ${service.provider}`}
        </p>
        <p className="text-sm">
          <strong>Fully delivered {delivered} of {log.length} weeks</strong> since the plan started.
        </p>
        <ol className="flex flex-wrap gap-1" aria-label="Week by week">
          {log.map((l) => (
            <li
              key={l.date}
              title={`Week of ${formatShortDate(addDays(l.date, -4))}: ${deliveryStatusLabels[l.status]}`}
              className={cn("size-4 rounded-sm", statusSquare[l.status])}
            >
              <span className="sr-only">
                Week ending {formatDate(l.date)}: {deliveryStatusLabels[l.status]}
              </span>
            </li>
          ))}
        </ol>
        {issues.length > 0 && (
          <ul className="space-y-1 text-sm">
            {issues.map((l) => {
              const Icon = statusIcon[l.status];
              return (
                <li key={l.date} className="flex items-start gap-2">
                  <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>
                    <span className="font-semibold">
                      Week ending {formatShortDate(l.date)} — {deliveryStatusLabels[l.status].toLowerCase()}
                    </span>
                    {l.note && <span className="text-muted-foreground">: {l.note}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function AccommodationCard({ accommodation }: { accommodation: Accommodation }) {
  return (
    <Card>
      <CardContent className="space-y-2">
        <h3 className="font-extrabold">{accommodation.title}</h3>
        <p className="text-sm text-muted-foreground">{accommodation.details}</p>
        <ul className="space-y-1 text-sm">
          {[...accommodation.deliveryLog].reverse().map((l) => {
            const Icon = statusIcon[l.status];
            return (
              <li key={l.date} className="flex items-start gap-2">
                <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  <span className="font-semibold">{formatDate(l.date)} — {deliveryStatusLabels[l.status]}</span>
                  {l.note && <span className="text-muted-foreground">: {l.note}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
