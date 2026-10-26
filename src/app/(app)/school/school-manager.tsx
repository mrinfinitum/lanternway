"use client";

import { useState } from "react";
import {
  CalendarClock,
  CircleAlert,
  CircleCheck,
  CircleMinus,
  ClipboardCheck,
  LineChart,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { Field, FormDialog, SelectField, TextAreaField, text } from "@/components/form-dialog";
import { EmptyState } from "@/components/lumi-tip";
import { PageHeader, SectionHeading } from "@/components/page-header";
import { Stat } from "@/components/stat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addDays } from "@/lib/dates";
import { formatDate, formatRelativeDays, formatShortDate } from "@/lib/format";
import { deliveryStatusLabels, schoolMessageTypeLabels } from "@/lib/labels";
import type {
  Accommodation,
  ChildSchool,
  DeliveryStatus,
  IepGoal,
  IepPlan,
  IsoDate,
  SchoolMessage,
  SchoolMessageType,
  TeamMember,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { newId, useRecordActions, useRecords } from "../_components/records-store";

type Props = {
  childId: string;
  childName: string;
  /** What the parent said when adding the child, if anything. */
  school?: ChildSchool;
  today: IsoDate;
  plans: IepPlan[];
  goals: IepGoal[];
  supports: Accommodation[];
  messages: SchoolMessage[];
  /** Server-rendered check-ins tab (teacher responses aren't edited here). */
  checkIns: React.ReactNode;
};

const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

/** School: IEP/504 plan, goals, supports, messages, and team, all editable for this visit. */
export function SchoolManager({ childId, childName, school, today, plans, goals, supports, messages, checkIns }: Props) {
  const plan = useRecords("iepPlans", plans)
    .filter((p) => p.childId === childId)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .at(-1);
  const allGoals = useRecords("iepGoals", goals).filter((g) => g.planId === plan?.id);
  const allSupports = useRecords("accommodations", supports).filter((s) => s.planId === plan?.id);
  const allMessages = useRecords("schoolMessages", messages)
    .filter((m) => m.childId === childId)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (!plan) {
    return (
      <div className="space-y-8">
        <PageHeader title="School" description={[school?.name, school?.grade].filter(Boolean).join(" · ") || undefined} />
        <EmptyState>
          <p className="font-bold text-teal">
            {school?.planStatus === "evaluating"
              ? `${childName} is being evaluated for a plan.`
              : school?.planStatus === "none"
                ? `${childName} doesn't have an IEP or 504 plan.`
                : `No IEP or 504 plan for ${childName} yet.`}
          </p>
          <p className="mt-1 mb-3 text-sm">
            {school?.planStatus === "evaluating"
              ? "When the school shares the plan, add it here to follow goals, services, and accommodations."
              : "If there's a plan, add it to follow goal progress, services, and accommodations here."}
          </p>
          <PlanForm childId={childId} today={today} />
        </EmptyState>
        <section aria-labelledby="teacher-checkins" className="space-y-6">
          <SectionHeading id="teacher-checkins">Teacher check-ins</SectionHeading>
          {checkIns}
        </section>
        <MessagesSection childId={childId} today={today} messages={allMessages} />
      </div>
    );
  }

  const services = allSupports.filter((s) => s.kind === "service");
  const accommodations = allSupports.filter((s) => s.kind === "accommodation");

  return (
    <div className="space-y-6">
      <PageHeader
        title="School"
        description={[plan.school, plan.type.toUpperCase(), plan.grade].filter(Boolean).join(" · ")}
        action={<PlanForm childId={childId} today={today} plan={plan} />}
      />

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
              <TabsTrigger key={value} value={value} className="rounded-full px-4 font-bold data-active:bg-teal data-active:text-paper">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="goals" className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">Progress from the school&apos;s progress reports. The marker shows each goal&apos;s target.</p>
            <GoalForm planId={plan.id} />
          </div>
          {allGoals.length === 0 && (
            <EmptyState>
              <p className="text-sm">No goals yet. Add each goal from the plan to follow its progress.</p>
            </EmptyState>
          )}
          {allGoals.map((g) => (
            <GoalCard key={g.id} goal={g} today={today} />
          ))}
        </TabsContent>

        <TabsContent value="supports" className="mt-4 space-y-8">
          <section aria-labelledby="services">
            <SectionHeading id="services" action={<SupportForm planId={plan.id} kind="service" />}>
              Services
            </SectionHeading>
            <DeliveryLegend />
            <div className="mt-3 space-y-3">
              {services.length === 0 && <p className="text-sm text-muted-foreground">No services added.</p>}
              {services.map((s) => (
                <ServiceCard key={s.id} service={s} today={today} />
              ))}
            </div>
          </section>
          <section aria-labelledby="accommodations">
            <SectionHeading id="accommodations" action={<SupportForm planId={plan.id} kind="accommodation" />}>
              Accommodations
            </SectionHeading>
            <div className="space-y-3">
              {accommodations.length === 0 && <p className="text-sm text-muted-foreground">No accommodations added.</p>}
              {accommodations.map((a) => (
                <AccommodationCard key={a.id} accommodation={a} today={today} />
              ))}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="check-ins" className="mt-4 space-y-6">
          {checkIns}
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          <MessagesSection childId={childId} today={today} messages={allMessages} />
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <TeamCard plan={plan} />
        </TabsContent>
      </Tabs>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarClock className="size-4" aria-hidden /> Plan dates come from the IEP document the school shared.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small shared bits
// ---------------------------------------------------------------------------

const addButton = (label: string) => (
  <Button size="sm" className="rounded-full">
    <Plus /> {label}
  </Button>
);
const editButton = (
  <Button size="sm" variant="ghost" className="rounded-full">
    <Pencil /> Edit
  </Button>
);

/** Two-step delete inside a FormDialog footer. */
function DeleteButton({ what, onDelete, close }: { what: string; onDelete: () => void; close: () => void }) {
  const [confirming, setConfirming] = useState(false);
  return confirming ? (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      className="rounded-full"
      onClick={() => {
        onDelete();
        close();
      }}
    >
      Delete {what}
    </Button>
  ) : (
    <Button type="button" variant="ghost" size="sm" className="rounded-full text-destructive" onClick={() => setConfirming(true)}>
      <Trash2 /> Delete…
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

function PlanForm({ childId, today, plan }: { childId: string; today: IsoDate; plan?: IepPlan }) {
  const { save, remove } = useRecordActions();
  return (
    <FormDialog
      title={plan ? "Edit plan details" : "Add an IEP or 504 plan"}
      description="Copy the dates and names from the plan the school shared."
      saveLabel={plan ? "Save" : "Add plan"}
      trigger={
        plan ? (
          <Button size="sm" variant="outline" className="rounded-full bg-white">
            <Pencil /> Edit plan
          </Button>
        ) : (
          addButton("Add plan")
        )
      }
      onSave={(form) => {
        const startDate = text(form, "startDate");
        const annualReviewDate = text(form, "annualReviewDate");
        const reevaluationDate = text(form, "reevaluationDate");
        if (!text(form, "school")) return "Please add the school's name.";
        if (!isDate(startDate)) return "Please add when the plan started.";
        if (startDate > today) return "The start date can't be in the future.";
        if (!isDate(annualReviewDate)) return "Please add the annual review date.";
        if (annualReviewDate < startDate) return "The annual review can't be before the plan started.";
        if (reevaluationDate && reevaluationDate < startDate) return "The re-evaluation can't be before the plan started.";
        save("iepPlans", {
          id: plan?.id ?? newId("plan"),
          childId,
          type: text(form, "type") as IepPlan["type"],
          school: text(form, "school"),
          grade: text(form, "grade"),
          startDate,
          annualReviewDate,
          reevaluationDate: reevaluationDate || addDays(startDate, 3 * 365),
          caseManager: text(form, "caseManager"),
          team: plan?.team ?? [],
        });
      }}
      destructive={
        plan ? (close) => <DeleteButton what="plan" close={close} onDelete={() => remove("iepPlans", plan.id)} /> : undefined
      }
    >
      <SelectField
        name="type"
        label="Plan type"
        required
        defaultValue={plan?.type ?? "iep"}
        options={[
          { value: "iep", label: "IEP" },
          { value: "504", label: "504 plan" },
        ]}
      />
      <Field name="school" label="School" required defaultValue={plan?.school} />
      <div className="grid grid-cols-2 gap-3">
        <Field name="grade" label="Grade" defaultValue={plan?.grade} />
        <Field name="caseManager" label="Case manager" defaultValue={plan?.caseManager} />
      </div>
      <Field name="startDate" label="Plan started" type="date" required max={today} defaultValue={plan?.startDate ?? today} />
      <div className="grid grid-cols-2 gap-3">
        <Field name="annualReviewDate" label="Annual review" type="date" required defaultValue={plan?.annualReviewDate} />
        <Field name="reevaluationDate" label="Re-evaluation" type="date" defaultValue={plan?.reevaluationDate} />
      </div>
    </FormDialog>
  );
}

function TeamCard({ plan }: { plan: IepPlan }) {
  const { save } = useRecordActions();
  const setTeam = (team: TeamMember[]) => save("iepPlans", { ...plan, team });
  return (
    <Card>
      <CardContent>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 font-bold">
            <Users className="size-4" aria-hidden /> IEP team{plan.caseManager && ` · case manager ${plan.caseManager}`}
          </p>
          <FormDialog
            title="Add a team member"
            saveLabel="Add"
            trigger={addButton("Add")}
            onSave={(form) => {
              const name = text(form, "name");
              const email = text(form, "email");
              if (!name) return "Please add a name.";
              if (email && !/^\S+@\S+\.\S+$/.test(email)) return "That email address doesn't look complete.";
              setTeam([...plan.team, { name, role: text(form, "role"), email: email || undefined }]);
            }}
          >
            <Field name="name" label="Name" required />
            <Field name="role" label="Role" placeholder="e.g. Special education teacher" />
            <Field name="email" label="Email" type="email" />
          </FormDialog>
        </div>
        {plan.team.length === 0 && <p className="text-sm text-muted-foreground">No team members added.</p>}
        <ul className="divide-y">
          {plan.team.map((t, i) => (
            <li key={`${t.name}-${i}`} className="flex items-center justify-between gap-2 py-2">
              <div>
                <p className="font-semibold">{t.name}</p>
                <p className="text-sm text-muted-foreground">
                  {t.role}
                  {t.email && (
                    <>
                      {" "}
                      · <a href={`mailto:${t.email}`} className="underline-offset-4 hover:underline">{t.email}</a>
                    </>
                  )}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="rounded-full"
                aria-label={`Remove ${t.name} from the team`}
                onClick={() => setTeam(plan.team.filter((_, j) => j !== i))}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

function GoalForm({ planId, goal }: { planId: string; goal?: IepGoal }) {
  const { save, remove } = useRecordActions();
  return (
    <FormDialog
      title={goal ? "Edit goal" : "Add a goal"}
      description="Copy the goal from the plan. Progress is tracked as a percentage toward the target."
      saveLabel={goal ? "Save" : "Add goal"}
      trigger={goal ? editButton : addButton("Add goal")}
      onSave={(form) => {
        const description = text(form, "description");
        const targetValue = Number(text(form, "targetValue"));
        if (!text(form, "area")) return "Please add the goal area, like Reading or Self-advocacy.";
        if (!description) return "Please add the goal itself.";
        if (!(targetValue > 0 && targetValue <= 100)) return "The target should be a percentage between 1 and 100.";
        save("iepGoals", {
          id: goal?.id ?? newId("goal"),
          planId,
          area: text(form, "area"),
          description,
          baseline: text(form, "baseline"),
          target: text(form, "target") || `${targetValue}%`,
          unit: text(form, "unit") || "%",
          targetValue,
          progress: goal?.progress ?? [],
        });
      }}
      destructive={goal ? (close) => <DeleteButton what="goal" close={close} onDelete={() => remove("iepGoals", goal.id)} /> : undefined}
    >
      <Field name="area" label="Area" required placeholder="e.g. Reading comprehension" defaultValue={goal?.area} />
      <TextAreaField name="description" label="Goal" required rows={3} defaultValue={goal?.description} />
      <div className="grid grid-cols-2 gap-3">
        <Field name="baseline" label="Starting point" placeholder="e.g. 50% accuracy" defaultValue={goal?.baseline} />
        <Field name="target" label="Target, in words" placeholder="e.g. 80% accuracy" defaultValue={goal?.target} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field name="targetValue" label="Target (%)" required inputMode="numeric" defaultValue={goal?.targetValue ?? 80} />
        <Field name="unit" label="Measured as" placeholder="e.g. % of trials" defaultValue={goal?.unit} />
      </div>
    </FormDialog>
  );
}

function ProgressForm({ goal, today }: { goal: IepGoal; today: IsoDate }) {
  const { save } = useRecordActions();
  return (
    <FormDialog
      title="Add progress"
      description={`${goal.area}. Use the number from the school's progress report.`}
      saveLabel="Add progress"
      trigger={
        <Button size="sm" variant="outline" className="rounded-full bg-white">
          <LineChart /> Add progress
        </Button>
      }
      onSave={(form) => {
        const date = text(form, "date");
        const value = Number(text(form, "value"));
        if (!isDate(date)) return "Please add the report date.";
        if (date > today) return "The date can't be in the future.";
        if (!(value >= 0 && value <= 100)) return "Please add a percentage between 0 and 100.";
        const progress = [
          ...goal.progress.filter((p) => p.date !== date),
          { date, value, reportedBy: text(form, "reportedBy") || "Parent", note: text(form, "note") || undefined },
        ].sort((a, b) => a.date.localeCompare(b.date));
        save("iepGoals", { ...goal, progress });
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field name="date" label="Report date" type="date" required max={today} defaultValue={today} />
        <Field name="value" label={`Result (${goal.unit || "%"})`} required inputMode="numeric" />
      </div>
      <Field name="reportedBy" label="Reported by" placeholder="e.g. case manager" />
      <TextAreaField name="note" label="Note" />
    </FormDialog>
  );
}

function GoalCard({ goal, today }: { goal: IepGoal; today: IsoDate }) {
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
            <span>Baseline: {goal.baseline || "—"}</span>
            <span>Target: {goal.target}</span>
          </div>
        </div>
        {goal.progress.length > 0 ? (
          <ol className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {goal.progress.map((p) => (
              <li key={p.date} className="rounded-xl bg-white px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  {formatShortDate(p.date)}, {p.date.slice(2, 4)}
                </p>
                <p className="font-extrabold">{p.value}%</p>
                {p.note && <p className="text-xs">{p.note}</p>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">No progress reports yet.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <ProgressForm goal={goal} today={today} />
          <GoalForm planId={goal.planId} goal={goal} />
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Services & accommodations
// ---------------------------------------------------------------------------

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

const statusOptions = (Object.keys(deliveryStatusLabels) as DeliveryStatus[]).map((s) => ({ value: s, label: deliveryStatusLabels[s] }));

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

function SupportForm({ planId, kind, support }: { planId: string; kind: Accommodation["kind"]; support?: Accommodation }) {
  const { save, remove } = useRecordActions();
  const noun = kind === "service" ? "service" : "accommodation";
  return (
    <FormDialog
      title={support ? `Edit ${noun}` : `Add a${kind === "accommodation" ? "n" : ""} ${noun}`}
      description={
        kind === "service"
          ? "Scheduled help from the plan, like speech therapy minutes."
          : "A support the plan says the school will provide, like extra time or breaks."
      }
      saveLabel={support ? "Save" : "Add"}
      trigger={support ? editButton : addButton("Add")}
      onSave={(form) => {
        const title = text(form, "title");
        if (!title) return `Please add the ${noun}'s name.`;
        save("accommodations", {
          id: support?.id ?? newId("acc"),
          planId,
          kind,
          title,
          details: text(form, "details"),
          frequency: kind === "service" ? text(form, "frequency") || undefined : undefined,
          provider: text(form, "provider") || undefined,
          deliveryLog: support?.deliveryLog ?? [],
        });
      }}
      destructive={support ? (close) => <DeleteButton what={noun} close={close} onDelete={() => remove("accommodations", support.id)} /> : undefined}
    >
      <Field name="title" label="Name" required placeholder={kind === "service" ? "e.g. Occupational therapy" : "e.g. Extended time"} defaultValue={support?.title} />
      <TextAreaField name="details" label="Details" defaultValue={support?.details} />
      {kind === "service" && <Field name="frequency" label="How often" placeholder="e.g. 2 × 30 min/week" defaultValue={support?.frequency} />}
      <Field name="provider" label="Who provides it" defaultValue={support?.provider} />
    </FormDialog>
  );
}

function DeliveryForm({ support, today }: { support: Accommodation; today: IsoDate }) {
  const { save } = useRecordActions();
  const service = support.kind === "service";
  return (
    <FormDialog
      title={service ? `Log this week: ${support.title}` : `Log: ${support.title}`}
      description={service ? "Was the service delivered as the plan says?" : "Was the accommodation provided?"}
      saveLabel="Save"
      trigger={
        <Button size="sm" variant="outline" className="rounded-full bg-white">
          <ClipboardCheck /> {service ? "Log this week" : "Log"}
        </Button>
      }
      onSave={(form) => {
        const date = text(form, "date");
        if (!isDate(date)) return "Please add a date.";
        if (date > today) return "The date can't be in the future.";
        const deliveryLog = [
          ...support.deliveryLog.filter((l) => l.date !== date),
          { date, status: text(form, "status") as DeliveryStatus, note: text(form, "note") || undefined },
        ].sort((a, b) => a.date.localeCompare(b.date));
        save("accommodations", { ...support, deliveryLog });
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field name="date" label={service ? "Week ending" : "Date"} type="date" required max={today} defaultValue={today} />
        <SelectField name="status" label="What happened" required options={statusOptions} />
      </div>
      <TextAreaField name="note" label="Note" placeholder="e.g. Therapist out sick; make-up session offered" />
    </FormDialog>
  );
}

function ServiceCard({ service, today }: { service: Accommodation; today: IsoDate }) {
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
        {log.length > 0 ? (
          <>
            <p className="text-sm">
              <strong>
                Fully delivered {delivered} of {log.length} weeks
              </strong>{" "}
              since the plan started.
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
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Nothing logged yet.</p>
        )}
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
        <div className="flex flex-wrap gap-2">
          <DeliveryForm support={service} today={today} />
          <SupportForm planId={service.planId} kind="service" support={service} />
        </div>
      </CardContent>
    </Card>
  );
}

function AccommodationCard({ accommodation, today }: { accommodation: Accommodation; today: IsoDate }) {
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
                  <span className="font-semibold">
                    {formatDate(l.date)} — {deliveryStatusLabels[l.status]}
                  </span>
                  {l.note && <span className="text-muted-foreground">: {l.note}</span>}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap gap-2 pt-1">
          <DeliveryForm support={accommodation} today={today} />
          <SupportForm planId={accommodation.planId} kind="accommodation" support={accommodation} />
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

const messageTypeOptions = (Object.keys(schoolMessageTypeLabels) as SchoolMessageType[]).map((t) => ({
  value: t,
  label: schoolMessageTypeLabels[t],
}));

function MessageForm({ childId, today, message }: { childId: string; today: IsoDate; message?: SchoolMessage }) {
  const { save, remove } = useRecordActions();
  return (
    <FormDialog
      title={message ? "Edit message" : "Add a school message"}
      description="Emails, calls, meetings, and notes home, so there's one record of what was said."
      saveLabel={message ? "Save" : "Add"}
      trigger={message ? editButton : addButton("Add")}
      onSave={(form) => {
        const date = text(form, "date");
        const subject = text(form, "subject");
        if (!isDate(date)) return "Please add a date.";
        if (date > today) return "The date can't be in the future.";
        if (!subject) return "Please add what it was about.";
        save("schoolMessages", {
          id: message?.id ?? newId("msg"),
          childId,
          date,
          type: text(form, "type") as SchoolMessageType,
          direction: text(form, "direction") as SchoolMessage["direction"],
          person: text(form, "person"),
          role: text(form, "role"),
          subject,
          summary: text(form, "summary"),
          attachments: message?.attachments ?? [],
        });
      }}
      destructive={message ? (close) => <DeleteButton what="message" close={close} onDelete={() => remove("schoolMessages", message.id)} /> : undefined}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field name="date" label="Date" type="date" required max={today} defaultValue={message?.date ?? today} />
        <SelectField name="type" label="Type" required options={messageTypeOptions} defaultValue={message?.type ?? "email"} />
      </div>
      <SelectField
        name="direction"
        label="Who reached out"
        required
        defaultValue={message?.direction ?? "from-school"}
        options={[
          { value: "from-school", label: "The school" },
          { value: "to-school", label: "We did" },
          { value: "both", label: "Both (a meeting or call)" },
        ]}
      />
      <div className="grid grid-cols-2 gap-3">
        <Field name="person" label="Person" defaultValue={message?.person} />
        <Field name="role" label="Their role" defaultValue={message?.role} />
      </div>
      <Field name="subject" label="About" required defaultValue={message?.subject} />
      <TextAreaField name="summary" label="Summary" rows={3} defaultValue={message?.summary} />
    </FormDialog>
  );
}

function MessagesSection({ childId, today, messages }: { childId: string; today: IsoDate; messages: SchoolMessage[] }) {
  return (
    <section aria-labelledby="school-messages">
      <SectionHeading id="school-messages" action={<MessageForm childId={childId} today={today} />}>
        Messages with school
      </SectionHeading>
      {messages.length === 0 && <p className="text-sm text-muted-foreground">No messages recorded yet.</p>}
      <ol className="space-y-3">
        {messages.map((m) => (
          <li key={m.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="bg-white">
                {schoolMessageTypeLabels[m.type]}
              </Badge>
              <span>{formatDate(m.date)}</span>
              {m.person && (
                <>
                  <span>·</span>
                  <span>
                    {m.direction === "to-school" ? "To" : m.direction === "from-school" ? "From" : "With"} {m.person}
                    {m.role && `, ${m.role}`}
                  </span>
                </>
              )}
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
            <div className="mt-2">
              <MessageForm childId={childId} today={today} message={m} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
