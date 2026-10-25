"use client";

import { useState } from "react";
import { CalendarClock, Pencil, Pill, Plus, TrendingUp, CircleStop } from "lucide-react";
import { Field, FormDialog, SelectField, TextAreaField, text } from "@/components/form-dialog";
import { EmptyState } from "@/components/lumi-tip";
import { SectionHeading } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatRelativeDays } from "@/lib/format";
import { providerTypeLabels } from "@/lib/labels";
import { refillDueDate } from "@/lib/insights";
import type { IsoDate, Medication, MedicationChange, Provider } from "@/lib/types";
import { newId, useRecordActions, useRecords } from "../_components/records-store";
import { MedicationNameAndForm } from "./medication-name-field";

const OTHER = "__other";

type Props = {
  childId: string;
  childName: string;
  today: IsoDate;
  medications: Medication[];
  changes: MedicationChange[];
  providers: Provider[];
};

/** Current and past medications, with add / change dose / stop / edit. Edits last for this visit. */
export function MedicationManager({ childId, childName, today, medications, changes, providers }: Props) {
  const meds = useRecords("medications", medications).filter((m) => m.childId === childId);
  const allChanges = useRecords("medicationChanges", changes);
  const team = useRecords("providers", providers).filter((p) => p.childId === childId);
  const [status, setStatus] = useState("");

  const historyOf = (medId: string) =>
    allChanges.filter((c) => c.medicationId === medId).sort((a, b) => a.date.localeCompare(b.date));
  const current = meds.filter((m) => !m.stopDate);
  const past = meds.filter((m) => m.stopDate);
  const recordedThisVisit = allChanges
    .filter((c) => c.id.includes("-local-") && meds.some((m) => m.id === c.medicationId))
    .reverse()
    .sort((a, b) => b.date.localeCompare(a.date));

  const prescriberOf = (m: Medication) => m.prescriberName || team.find((p) => p.id === m.prescriberId)?.name;
  const ctx = { childId, childName, today, team, historyOf, announce: setStatus };

  return (
    <div className="space-y-8">
      <p role="status" aria-live="polite" className="sr-only">
        {status}
      </p>

      <section aria-labelledby="current-meds">
        <SectionHeading id="current-meds" action={<AddMedication {...ctx} />}>
          Current medications
        </SectionHeading>
        {current.length === 0 ? (
          <EmptyState>
            <p className="font-bold text-teal">No current medications for {childName}.</p>
            <p className="mt-1 text-sm">Add one to keep doses, the prescriber, and refills in one place.</p>
          </EmptyState>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {current.map((med) => {
              const latest = historyOf(med.id).at(-1);
              const due = refillDueDate(med.lastFilledOn, med.daysSupply);
              return (
                <Card key={med.id}>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white">
                        <Pill className="size-5" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-lg font-extrabold">{med.name}</h3>
                        <p className="text-muted-foreground">
                          {latest ? `${latest.doseMg} mg · ${latest.schedule}` : "No dose recorded"}
                        </p>
                      </div>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <Detail label="For" value={med.purpose} />
                      <Detail label="Prescriber" value={prescriberOf(med)} />
                      <Detail label="Started" value={formatDate(med.startDate)} />
                      <Detail label="How" value={med.form} />
                    </dl>
                    {due && (
                      <p className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm">
                        <CalendarClock className="size-4 shrink-0" aria-hidden />
                        <span>
                          Refill due <strong>{formatDate(due)}</strong> ({formatRelativeDays(due, today)})
                          {med.pharmacy && <> · {med.pharmacy}</>}
                        </span>
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <ChangeDose med={med} {...ctx} />
                      <StopMedication med={med} {...ctx} />
                      <EditMedication med={med} {...ctx} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section aria-labelledby="past-meds">
          <SectionHeading id="past-meds">Past medications</SectionHeading>
          <ul className="space-y-2 text-sm">
            {past.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-card px-4 py-3 ring-1 ring-border">
                <span>
                  <span className="font-bold">{m.name}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {formatDate(m.startDate)} – {formatDate(m.stopDate!)}
                    {prescriberOf(m) && ` · ${prescriberOf(m)}`}
                  </span>
                </span>
                <EditMedication med={m} {...ctx} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {recordedThisVisit.length > 0 && (
        <section aria-labelledby="recorded-now" className="rounded-2xl bg-amber/15 p-4">
          <h2 id="recorded-now" className="font-bold">
            Recorded this visit
          </h2>
          <ul className="mt-2 space-y-1 text-sm">
            {recordedThisVisit.map((c) => (
              <li key={c.id}>
                <span className="font-semibold">{formatDate(c.date)}:</span>{" "}
                {describe(c, meds.find((m) => m.id === c.medicationId)?.name ?? "Medication")}
                {c.reason && <span className="text-muted-foreground"> · {c.reason}</span>}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            Prototype: in the working version these are saved and show up in the charts, timeline, and reports.
          </p>
        </section>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{value || "—"}</dd>
    </div>
  );
}

function describe(c: MedicationChange, name: string) {
  if (c.type === "start") return `Started ${name} ${c.doseMg} mg, ${c.schedule.toLowerCase()}`;
  if (c.type === "stop") return `Stopped ${name}`;
  return `${name} changed to ${c.doseMg} mg, ${c.schedule.toLowerCase()}`;
}

type Ctx = {
  childId: string;
  childName: string;
  today: IsoDate;
  team: Provider[];
  historyOf: (medId: string) => MedicationChange[];
  announce: (message: string) => void;
};

const NO_ADVICE = "Record what the prescriber decided. Lanternway doesn't suggest doses or changes.";

/** Parse a dose in mg. Returns null when it isn't a positive number. */
function parseDose(value: string): number | null {
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function validDate(value: string, today: IsoDate, notBefore?: IsoDate): string | void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Please add a date.";
  if (value > today) return "The date can't be in the future.";
  if (notBefore && value < notBefore) return `The date can't be before ${formatDate(notBefore)}.`;
}

/** Prescriber picker: anyone on the care team, or a typed-in name. */
function PrescriberField({ team, defaultId, defaultName }: { team: Provider[]; defaultId?: string; defaultName?: string }) {
  const initial = defaultName ? OTHER : defaultId && team.some((p) => p.id === defaultId) ? defaultId : "";
  const [choice, setChoice] = useState(initial);
  const options = [
    { value: "", label: "Not sure / skip" },
    ...team
      .filter((p) => !p.endDate || p.id === defaultId)
      .sort((a, b) => Number(["psychiatry", "pediatrics"].includes(b.type)) - Number(["psychiatry", "pediatrics"].includes(a.type)))
      .map((p) => ({ value: p.id, label: `${p.name} · ${providerTypeLabels[p.type]}` })),
    { value: OTHER, label: "Someone else…" },
  ];
  return (
    <>
      <SelectField
        name="prescriber"
        label="Prescriber"
        options={options}
        value={choice}
        onChange={(e) => setChoice(e.target.value)}
        hint="Add doctors in Therapy & care team to pick them here."
      />
      {choice === OTHER && <Field name="prescriberName" label="Prescriber's name" required defaultValue={defaultName} />}
    </>
  );
}

function readPrescriber(form: FormData): { prescriberId: string; prescriberName?: string } | string {
  const choice = text(form, "prescriber");
  if (choice === OTHER) {
    const name = text(form, "prescriberName");
    return name ? { prescriberId: "", prescriberName: name } : "Please add the prescriber's name.";
  }
  return { prescriberId: choice, prescriberName: undefined };
}

function AddMedication({ childId, childName, today, team, announce }: Ctx) {
  const { save } = useRecordActions();
  return (
    <FormDialog
      title={`Add a medication for ${childName}`}
      description={NO_ADVICE}
      saveLabel="Add medication"
      trigger={
        <Button size="sm" className="rounded-full">
          <Plus /> Add
        </Button>
      }
      onSave={(form) => {
        const name = text(form, "name");
        const dose = parseDose(text(form, "dose"));
        const schedule = text(form, "schedule");
        const startDate = text(form, "startDate");
        if (!name) return "Please add the medication's name.";
        if (dose == null) return "Please add the dose as a number of mg.";
        if (!schedule) return "Please add when it's taken.";
        const dateProblem = validDate(startDate, today);
        if (dateProblem) return dateProblem;
        const prescriber = readPrescriber(form);
        if (typeof prescriber === "string") return prescriber;
        const daysSupply = Number(text(form, "daysSupply")) || undefined;

        const med: Medication = {
          id: newId("med"),
          childId,
          name,
          purpose: text(form, "purpose"),
          form: text(form, "form"),
          startDate,
          pharmacy: text(form, "pharmacy") || undefined,
          lastFilledOn: text(form, "lastFilledOn") || undefined,
          daysSupply,
          ...prescriber,
        };
        save("medications", med);
        save("medicationChanges", {
          id: newId("chg"),
          medicationId: med.id,
          date: startDate,
          type: "start",
          doseMg: dose,
          schedule,
          reason: text(form, "reason"),
          sideEffectsObserved: [],
        });
        announce(`Added ${name}.`);
      }}
    >
      <MedicationNameAndForm />
      <Field name="dose" label="Dose (mg)" required inputMode="decimal" hint="As written on the prescription." />
      <Field name="purpose" label="What it's for" placeholder="In your own words" />
      <Field name="schedule" label="When it's taken" required placeholder="e.g. Once daily, morning" />
      <PrescriberField team={team} />
      <Field name="startDate" label="Started on" type="date" required max={today} defaultValue={today} />
      <TextAreaField name="reason" label="Why it was started" hint="As the prescriber explained it." />
      <details className="rounded-xl px-3 py-2 ring-1 ring-border">
        <summary className="cursor-pointer text-sm font-bold">Pharmacy & refills</summary>
        <div className="mt-3 space-y-3">
          <Field name="pharmacy" label="Pharmacy" />
          <div className="grid grid-cols-2 gap-3">
            <Field name="lastFilledOn" label="Last filled" type="date" max={today} />
            <Field name="daysSupply" label="Days supply" inputMode="numeric" />
          </div>
        </div>
      </details>
    </FormDialog>
  );
}

function ChangeDose({ med, today, historyOf, announce }: Ctx & { med: Medication }) {
  const { save } = useRecordActions();
  const latest = historyOf(med.id).at(-1);
  return (
    <FormDialog
      title={`Change in ${med.name}`}
      description={NO_ADVICE}
      saveLabel="Save change"
      trigger={
        <Button size="sm" variant="outline" className="rounded-full bg-white">
          <TrendingUp /> Change dose
        </Button>
      }
      onSave={(form) => {
        const dose = parseDose(text(form, "dose"));
        const schedule = text(form, "schedule");
        const date = text(form, "date");
        if (dose == null) return "Please add the new dose as a number of mg.";
        if (!schedule) return "Please add when it's taken.";
        const dateProblem = validDate(date, today, latest?.date);
        if (dateProblem) return dateProblem;
        save("medicationChanges", {
          id: newId("chg"),
          medicationId: med.id,
          date,
          type: "dose-change",
          doseMg: dose,
          schedule,
          reason: text(form, "reason"),
          sideEffectsObserved: [],
          notes: text(form, "notes") || undefined,
        });
        announce(`${med.name} changed to ${dose} mg.`);
      }}
    >
      {latest && (
        <p className="rounded-xl bg-card px-3 py-2 text-sm ring-1 ring-border">
          Now: <strong>{latest.doseMg} mg</strong> · {latest.schedule}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field name="dose" label="New dose (mg)" required inputMode="decimal" />
        <Field name="date" label="Changed on" type="date" required max={today} min={latest?.date} defaultValue={today} />
      </div>
      <Field name="schedule" label="When it's taken" required defaultValue={latest?.schedule} />
      <TextAreaField name="reason" label="Why it changed" hint="As the prescriber explained it." />
      <TextAreaField name="notes" label="Anything else to remember" />
    </FormDialog>
  );
}

function StopMedication({ med, today, historyOf, announce }: Ctx & { med: Medication }) {
  const { save } = useRecordActions();
  const latest = historyOf(med.id).at(-1);
  return (
    <FormDialog
      title={`Stop ${med.name}`}
      description="It moves to past medications. Its history stays in the record."
      saveLabel="Stop medication"
      trigger={
        <Button size="sm" variant="outline" className="rounded-full bg-white">
          <CircleStop /> Stop
        </Button>
      }
      onSave={(form) => {
        const date = text(form, "date");
        const dateProblem = validDate(date, today, latest?.date ?? med.startDate);
        if (dateProblem) return dateProblem;
        save("medications", { ...med, stopDate: date });
        save("medicationChanges", {
          id: newId("chg"),
          medicationId: med.id,
          date,
          type: "stop",
          doseMg: 0,
          schedule: "Stopped",
          reason: text(form, "reason"),
          sideEffectsObserved: [],
        });
        announce(`${med.name} moved to past medications.`);
      }}
    >
      <Field name="date" label="Last day taken" type="date" required max={today} defaultValue={today} />
      <TextAreaField name="reason" label="Why it was stopped" hint="As the prescriber explained it." />
    </FormDialog>
  );
}

function EditMedication({ med, team, today, historyOf, announce }: Ctx & { med: Medication }) {
  const { save, remove } = useRecordActions();
  const [confirming, setConfirming] = useState(false);
  return (
    <FormDialog
      title={`Edit ${med.name}`}
      description="Fix details or update the prescriber and pharmacy. To record a dose change, use Change dose."
      trigger={
        <Button size="sm" variant="ghost" className="rounded-full">
          <Pencil /> Edit
        </Button>
      }
      onSave={(form) => {
        const name = text(form, "name");
        if (!name) return "Please add the medication's name.";
        const prescriber = readPrescriber(form);
        if (typeof prescriber === "string") return prescriber;
        save("medications", {
          ...med,
          name,
          purpose: text(form, "purpose"),
          form: text(form, "form"),
          pharmacy: text(form, "pharmacy") || undefined,
          lastFilledOn: text(form, "lastFilledOn") || undefined,
          daysSupply: Number(text(form, "daysSupply")) || undefined,
          ...prescriber,
        });
        setConfirming(false);
        announce(`Saved ${name}.`);
      }}
      destructive={(close) =>
        confirming ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="rounded-full"
            onClick={() => {
              remove("medications", med.id);
              for (const c of historyOf(med.id)) remove("medicationChanges", c.id);
              announce(`Deleted ${med.name}.`);
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
      <MedicationNameAndForm defaultName={med.name} defaultForm={med.form} />
      <Field name="purpose" label="What it's for" defaultValue={med.purpose} />
      <PrescriberField team={team} defaultId={med.prescriberId} defaultName={med.prescriberName} />
      <Field name="pharmacy" label="Pharmacy" defaultValue={med.pharmacy} />
      <div className="grid grid-cols-2 gap-3">
        <Field name="lastFilledOn" label="Last filled" type="date" max={today} defaultValue={med.lastFilledOn} />
        <Field name="daysSupply" label="Days supply" inputMode="numeric" defaultValue={med.daysSupply} />
      </div>
      {confirming && (
        <p role="alert" className="rounded-xl bg-coral/15 px-3 py-2 text-sm">
          Deleting removes {med.name} and its whole history. If {med.name} was stopped, use Stop instead so the history stays.
        </p>
      )}
    </FormDialog>
  );
}

