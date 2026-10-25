"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ChevronRight, Mail, Pencil, Phone, Plus, UserMinus } from "lucide-react";
import { Field, FormDialog, SelectField, text } from "@/components/form-dialog";
import { EmptyState } from "@/components/lumi-tip";
import { SectionHeading } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, plural } from "@/lib/format";
import { providerTypeLabels } from "@/lib/labels";
import type { IsoDate, Provider, ProviderType } from "@/lib/types";
import { newId, useRecordActions, useRecords } from "../_components/records-store";

type Summary = { activeGoals: number; totalGoals: number; lastSession?: IsoDate };

const typeOptions = (Object.keys(providerTypeLabels) as ProviderType[]).map((t) => ({ value: t, label: providerTypeLabels[t] }));

/** The Therapy & care team list: current and past providers, plus Add. */
export function CareTeamList({
  childId,
  childName,
  today,
  providers,
  summaries,
}: {
  childId: string;
  childName: string;
  today: IsoDate;
  providers: Provider[];
  summaries: Record<string, Summary>;
}) {
  const team = useRecords("providers", providers).filter((p) => p.childId === childId);
  const current = team.filter((p) => !p.endDate);
  const past = team.filter((p) => p.endDate);

  return (
    <div className="space-y-8">
      <section aria-labelledby="current-team">
        <SectionHeading id="current-team" action={<AddProvider childId={childId} childName={childName} today={today} />}>
          Current
        </SectionHeading>
        {current.length === 0 ? (
          <EmptyState>
            <p className="font-bold text-teal">No one on {childName}&apos;s care team yet.</p>
            <p className="mt-1 text-sm">Add therapists, doctors, and specialists to keep contacts, schedules, and goals together.</p>
          </EmptyState>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {current.map((p) => (
              <ProviderRow key={p.id} provider={p} summary={summaries[p.id]} />
            ))}
          </ul>
        )}
      </section>
      {past.length > 0 && (
        <section aria-labelledby="past-team">
          <SectionHeading id="past-team">Past</SectionHeading>
          <ul className="grid gap-3 md:grid-cols-2">
            {past.map((p) => (
              <ProviderRow key={p.id} provider={p} summary={summaries[p.id]} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ProviderRow({ provider, summary }: { provider: Provider; summary?: Summary }) {
  return (
    <li>
      <Link
        href={`/therapy/${provider.id}`}
        className="flex items-center gap-4 rounded-2xl bg-cream p-4 transition-colors hover:bg-amber/25"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-lg font-extrabold">
          {provider.name.replace("Dr. ", "")[0]}
        </span>
        <span className="min-w-0 flex-1">
          <Badge variant="secondary" className="mb-1 bg-white">
            {providerTypeLabels[provider.type]}
          </Badge>
          <span className="block font-extrabold">
            {provider.name}
            {provider.credentials && <span className="font-semibold text-muted-foreground">, {provider.credentials}</span>}
          </span>
          <span className="block text-sm text-muted-foreground">
            {provider.endDate ? `${formatDate(provider.startDate)} – ${formatDate(provider.endDate)}` : provider.schedule}
          </span>
          <span className="block text-xs text-muted-foreground">
            {summary && summary.totalGoals > 0 && `${plural(summary.activeGoals, "active goal")} · `}
            {summary?.lastSession ? `Last visit ${formatDate(summary.lastSession)}` : "No visits logged"}
          </span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}

/** Shared fields for add and edit. */
function ProviderFields({ provider, today }: { provider?: Provider; today: IsoDate }) {
  return (
    <>
      <SelectField name="type" label="Type" required options={typeOptions} defaultValue={provider?.type ?? "speech"} />
      <Field name="name" label="Name" required defaultValue={provider?.name} autoComplete="off" />
      <div className="grid grid-cols-2 gap-3">
        <Field name="credentials" label="Credentials" placeholder="e.g. OTR/L, MD" defaultValue={provider?.credentials} />
        <Field name="startDate" label="Started with" type="date" required max={today} defaultValue={provider?.startDate ?? today} />
      </div>
      <Field name="practice" label="Practice or clinic" defaultValue={provider?.practice} />
      <div className="grid grid-cols-2 gap-3">
        <Field name="phone" label="Phone" type="tel" defaultValue={provider?.phone} />
        <Field name="email" label="Email" type="email" defaultValue={provider?.email} />
      </div>
      <Field name="schedule" label="Schedule" placeholder="e.g. Tuesdays 4:00pm, weekly" defaultValue={provider?.schedule} />
    </>
  );
}

function readProvider(form: FormData, today: IsoDate): Omit<Provider, "id" | "childId"> | string {
  const name = text(form, "name");
  const startDate = text(form, "startDate");
  const email = text(form, "email");
  if (!name) return "Please add a name.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return "Please add when they started.";
  if (startDate > today) return "The start date can't be in the future.";
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return "That email address doesn't look complete.";
  return {
    type: text(form, "type") as ProviderType,
    name,
    credentials: text(form, "credentials") || undefined,
    practice: text(form, "practice"),
    phone: text(form, "phone"),
    email: email || undefined,
    schedule: text(form, "schedule") || undefined,
    startDate,
  };
}

function AddProvider({ childId, childName, today }: { childId: string; childName: string; today: IsoDate }) {
  const { save } = useRecordActions();
  return (
    <FormDialog
      title={`Add to ${childName}'s care team`}
      description="Therapists, doctors, specialists: anyone who supports your child."
      saveLabel="Add"
      trigger={
        <Button size="sm" className="rounded-full">
          <Plus /> Add
        </Button>
      }
      onSave={(form) => {
        const fields = readProvider(form, today);
        if (typeof fields === "string") return fields;
        save("providers", { id: newId("prov"), childId, ...fields });
      }}
    >
      <ProviderFields today={today} />
    </FormDialog>
  );
}

/** Provider page header with Edit / No longer seeing them / Delete. Reflects edits from this visit. */
export function ProviderHeader({ provider: fromServer, childName, today }: { provider: Provider; childName: string; today: IsoDate }) {
  const provider = useRecords("providers", [fromServer]).find((p) => p.id === fromServer.id);
  if (!provider) {
    return (
      <EmptyState>
        <p className="font-bold text-teal">This provider was removed.</p>
        <Link href="/therapy" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline">
          <ArrowLeft className="size-4" aria-hidden /> Back to the care team
        </Link>
      </EmptyState>
    );
  }
  return (
    <div className="space-y-4">
      <div>
        <Badge variant="secondary" className="mb-2 block w-fit">
          {providerTypeLabels[provider.type]}
        </Badge>
        <h1 className="text-2xl font-extrabold md:text-3xl">
          {provider.name}
          {provider.credentials && <span className="text-lg font-semibold text-muted-foreground">, {provider.credentials}</span>}
        </h1>
        {provider.practice && <p className="text-muted-foreground">{provider.practice}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <EditProvider provider={provider} today={today} />
          {!provider.endDate && <EndProvider provider={provider} childName={childName} today={today} />}
        </div>
      </div>
      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Schedule</p>
            <p className="font-semibold">{provider.endDate ? "No longer seeing them" : (provider.schedule ?? "—")}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">With {childName} since</p>
            <p className="font-semibold">
              {formatDate(provider.startDate)}
              {provider.endDate && ` – ${formatDate(provider.endDate)}`}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            {provider.phone ? (
              <a href={`tel:${provider.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-2 font-semibold hover:underline">
                <Phone className="size-4" aria-hidden /> {provider.phone}
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">No phone added</p>
            )}
            {provider.email && (
              <a href={`mailto:${provider.email}`} className="inline-flex items-center gap-2 font-semibold break-all hover:underline">
                <Mail className="size-4 shrink-0" aria-hidden /> {provider.email}
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EditProvider({ provider, today }: { provider: Provider; today: IsoDate }) {
  const { save, remove } = useRecordActions();
  const [confirming, setConfirming] = useState(false);
  return (
    <FormDialog
      title={`Edit ${provider.name}`}
      trigger={
        <Button size="sm" variant="outline" className="rounded-full bg-white">
          <Pencil /> Edit
        </Button>
      }
      onSave={(form) => {
        const fields = readProvider(form, today);
        if (typeof fields === "string") return fields;
        save("providers", { ...provider, ...fields });
        setConfirming(false);
      }}
      destructive={(close) =>
        confirming ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="rounded-full"
            onClick={() => {
              remove("providers", provider.id);
              close();
            }}
          >
            Delete for good
          </Button>
        ) : (
          <Button type="button" variant="ghost" size="sm" className="rounded-full text-destructive" onClick={() => setConfirming(true)}>
            Delete…
          </Button>
        )
      }
    >
      <ProviderFields provider={provider} today={today} />
      {confirming && (
        <p role="alert" className="rounded-xl bg-coral/15 px-3 py-2 text-sm">
          Deleting removes {provider.name} with their goals and session notes. If you&apos;ve just stopped seeing them, use
          &ldquo;No longer seeing them&rdquo; so the history stays.
        </p>
      )}
    </FormDialog>
  );
}

function EndProvider({ provider, childName, today }: { provider: Provider; childName: string; today: IsoDate }) {
  const { save } = useRecordActions();
  return (
    <FormDialog
      title={`No longer seeing ${provider.name}?`}
      description={`They move to Past. Their goals and notes stay in ${childName}'s record.`}
      saveLabel="Move to past"
      trigger={
        <Button size="sm" variant="ghost" className="rounded-full">
          <UserMinus /> No longer seeing them
        </Button>
      }
      onSave={(form) => {
        const endDate = text(form, "endDate");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return "Please add the last visit date.";
        if (endDate > today) return "The date can't be in the future.";
        if (endDate < provider.startDate) return `The date can't be before ${formatDate(provider.startDate)}.`;
        save("providers", { ...provider, endDate });
      }}
    >
      <Field name="endDate" label="Last visit" type="date" required max={today} min={provider.startDate} defaultValue={today} />
    </FormDialog>
  );
}

/** Shown for a provider added during this visit (the server doesn't know about them yet). */
export function ProviderAddedThisVisit({ id, childName, today }: { id: string; childName: string; today: IsoDate }) {
  const provider = useRecords("providers", []).find((p) => p.id === id);
  if (!provider) {
    return (
      <EmptyState>
        <p className="font-bold text-teal">We couldn&apos;t find that provider.</p>
        <p className="mt-1 text-sm">Providers added in this prototype last until you reload the page.</p>
      </EmptyState>
    );
  }
  return (
    <div className="space-y-8">
      <ProviderHeader provider={provider} childName={childName} today={today} />
      <p className="text-sm text-muted-foreground">Goals and session notes for {provider.name} will show here.</p>
    </div>
  );
}
