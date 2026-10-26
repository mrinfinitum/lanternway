"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Pencil, Plus, X } from "lucide-react";
import { Field, FormDialog, SelectField, TextAreaField, text } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { communicationStyleLabels } from "@/lib/labels";
import type { Child, CommunicationStyle, IsoDate } from "@/lib/types";
import { isSavedChildId } from "@/lib/child-profile";
import { useRecordActions } from "../_components/records-store";
import { saveChildProfile } from "./actions";

/**
 * Save a profile edit: show it right away, and for kids in the parent's own family
 * also save it to the database. Sample-family edits last for the visit only.
 */
function useSaveChild() {
  const { save } = useRecordActions();
  const [, startSaving] = useTransition();
  return (child: Child) => {
    save("children", child);
    if (isSavedChildId(child.id)) {
      startSaving(async () => {
        const result = await saveChildProfile(child);
        if (!result.ok && result.error) console.warn("About Me save failed:", result.error);
      });
    }
  };
}

/** Small "Edit" button with a clear accessible name, e.g. "Edit My strengths". */
function EditTrigger({ what, ...props }: { what: string } & React.ComponentProps<typeof Button>) {
  // Spread props so the dialog trigger's click handler and ref reach the button.
  return (
    <Button size="sm" variant="ghost" className="rounded-full" aria-label={`Edit ${what}`} {...props}>
      <Pencil /> Edit
    </Button>
  );
}

type Column = { name: string; label: string; type?: string; placeholder?: string; wide?: boolean };

/**
 * Editable rows: add, reword, or remove. Inputs share a name per column, so
 * `form.getAll(column)` returns the values in order.
 */
function RepeatRows({
  columns,
  initial,
  addLabel,
  itemLabel,
}: {
  columns: Column[];
  initial: Record<string, string>[];
  addLabel: string;
  itemLabel: string;
}) {
  const key = () => `row-${crypto.randomUUID().slice(0, 8)}`;
  const [rows, setRows] = useState(() => (initial.length ? initial : [{}]).map((values) => ({ key: key(), values })));
  const listRef = useRef<HTMLOListElement>(null);
  const focusNewRow = useRef(false);

  // After "Add", move keyboard focus into the new row's first field.
  useEffect(() => {
    if (!focusNewRow.current) return;
    focusNewRow.current = false;
    listRef.current?.querySelector<HTMLInputElement>("li:last-child input")?.focus();
  }, [rows]);

  return (
    <div className="space-y-3">
      <ol ref={listRef} className="space-y-2">
        {rows.map((row, i) => (
          <li key={row.key} className="flex items-start gap-2 rounded-xl bg-card p-2 ring-1 ring-border">
            <div className={columns.length > 1 ? "grid flex-1 gap-2 sm:grid-cols-2" : "flex-1"}>
              {columns.map((c) => (
                <div key={c.name} className={c.wide ? "sm:col-span-2" : undefined}>
                  <Label htmlFor={`${row.key}-${c.name}`} className={columns.length > 1 ? "mb-1 text-xs" : "sr-only"}>
                    {columns.length > 1 ? c.label : `${itemLabel} ${i + 1}`}
                  </Label>
                  <Input
                    id={`${row.key}-${c.name}`}
                    name={c.name}
                    type={c.type ?? "text"}
                    placeholder={c.placeholder}
                    defaultValue={row.values[c.name] ?? ""}
                    className="h-10 bg-white"
                  />
                </div>
              ))}
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="mt-0.5 shrink-0 rounded-full"
              aria-label={`Remove ${itemLabel.toLowerCase()} ${i + 1}`}
              onClick={() => setRows(rows.filter((r) => r.key !== row.key))}
            >
              <X />
            </Button>
          </li>
        ))}
      </ol>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-full bg-white"
        onClick={() => {
          focusNewRow.current = true;
          setRows([...rows, { key: key(), values: {} }]);
        }}
      >
        <Plus /> {addLabel}
      </Button>
    </div>
  );
}

/** Rows from a form, dropping rows whose first column is empty. */
function readRows(form: FormData, columns: string[]): Record<string, string>[] {
  const values = columns.map((c) => form.getAll(c).map((v) => String(v).trim()));
  return values[0].map((_, i) => Object.fromEntries(columns.map((c, j) => [c, values[j][i] ?? ""]))).filter((r) => r[columns[0]]);
}

/** Edit any simple list on the profile (strengths, loves, what helps…). */
export function ListEditor({
  child,
  field,
  title,
  description,
  itemLabel,
  placeholder,
}: {
  child: Child;
  field: "strengths" | "likes" | "dislikes" | "calmingStrategies" | "sensoryNeeds" | "triggers" | "dailyLife" | "allergies";
  title: string;
  description?: string;
  itemLabel: string;
  placeholder?: string;
}) {
  const saveChild = useSaveChild();
  return (
    <FormDialog
      title={title}
      description={description ?? "Add, reword, or remove. Short and specific works best."}
      trigger={<EditTrigger what={title.replace(/^Edit /, "")} />}
      onSave={(form) => {
        const items = [...new Set(readRows(form, ["item"]).map((r) => r.item))];
        saveChild({ ...child, [field]: items });
      }}
    >
      <RepeatRows
        columns={[{ name: "item", label: itemLabel, placeholder }]}
        initial={child[field].map((item) => ({ item }))}
        addLabel={`Add ${itemLabel.toLowerCase()}`}
        itemLabel={itemLabel}
      />
    </FormDialog>
  );
}

/** Name, pronouns, birthday, and the intro (with its private part kept separate). */
export function BasicsEditor({ child, today }: { child: Child; today: IsoDate }) {
  const saveChild = useSaveChild();
  return (
    <FormDialog
      title={`Edit ${child.firstName}'s basics`}
      description="The intro is shared in every summary, so keep health details in the private note below it."
      trigger={
        <Button size="sm" variant="outline" className="rounded-full bg-white" aria-label="Edit name, birthday, and intro">
          <Pencil /> Edit
        </Button>
      }
      onSave={(form) => {
        const firstName = text(form, "firstName");
        const birthDate = text(form, "birthDate");
        if (!firstName) return "Please add a first name.";
        if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return "Please add a birthday.";
        if (birthDate > today) return "The birthday can't be in the future.";
        saveChild({
          ...child,
          firstName,
          pronouns: text(form, "pronouns") || undefined,
          birthDate,
          aboutMe: text(form, "aboutMe"),
          aboutMeHealth: text(form, "aboutMeHealth") || undefined,
        });
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field name="firstName" label="First name" required defaultValue={child.firstName} autoComplete="off" />
        <Field name="pronouns" label="Pronouns" placeholder="e.g. she/her" defaultValue={child.pronouns} />
      </div>
      <Field name="birthDate" label="Birthday" type="date" required max={today} defaultValue={child.birthDate} />
      <TextAreaField
        name="aboutMe"
        label="Intro, in their words"
        rows={4}
        defaultValue={child.aboutMe}
        hint="e.g. “Hi! I'm Maya. I love horses…” Shared in every summary."
      />
      <TextAreaField
        name="aboutMeHealth"
        label="Private note about diagnoses"
        rows={2}
        defaultValue={child.aboutMeHealth}
        hint="Only added to a shared summary when you include Diagnoses."
      />
    </FormDialog>
  );
}

const styleOptions = (Object.keys(communicationStyleLabels) as CommunicationStyle[]).map((s) => ({
  value: s,
  label: communicationStyleLabels[s],
}));

export function CommunicationEditor({ child }: { child: Child }) {
  const saveChild = useSaveChild();
  return (
    <FormDialog
      title="How I communicate"
      description="Help someone new talk with them in the first five minutes."
      trigger={<EditTrigger what="How I communicate" />}
      onSave={(form) =>
        saveChild({
          ...child,
          communicationStyle: text(form, "style") as CommunicationStyle,
          communicationNotes: text(form, "notes"),
        })
      }
    >
      <SelectField name="style" label="Mostly communicates by" required options={styleOptions} defaultValue={child.communicationStyle} />
      <TextAreaField
        name="notes"
        label="Tips for talking together"
        rows={4}
        defaultValue={child.communicationNotes}
        hint="What works, what to avoid, how they show they need something."
      />
    </FormDialog>
  );
}

export function DiagnosesEditor({ child, today }: { child: Child; today: IsoDate }) {
  const saveChild = useSaveChild();
  const columns = ["name", "diagnosedOn", "diagnosedBy"];
  return (
    <FormDialog
      title="Diagnoses"
      description="Private. Only shared when you turn Diagnoses on."
      trigger={<EditTrigger what="Diagnoses" />}
      onSave={(form) => {
        const rows = readRows(form, columns);
        for (const r of rows) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(r.diagnosedOn)) return `Please add when “${r.name}” was diagnosed. A rough date is fine.`;
          if (r.diagnosedOn > today) return "A diagnosis date can't be in the future.";
        }
        saveChild({
          ...child,
          diagnoses: rows.map((r) => {
            const existing = child.diagnoses.find((d) => d.name === r.name);
            return {
              ...existing,
              name: r.name,
              tag: existing?.tag ?? r.name.toLowerCase().split(/[^a-z]+/)[0],
              diagnosedOn: r.diagnosedOn,
              diagnosedBy: r.diagnosedBy || undefined,
            };
          }),
        });
      }}
    >
      <RepeatRows
        itemLabel="Diagnosis"
        addLabel="Add diagnosis"
        columns={[
          { name: "name", label: "Diagnosis", wide: true },
          { name: "diagnosedOn", label: "When", type: "date" },
          { name: "diagnosedBy", label: "By (optional)" },
        ]}
        initial={child.diagnoses.map((d) => ({ name: d.name, diagnosedOn: d.diagnosedOn, diagnosedBy: d.diagnosedBy ?? "" }))}
      />
    </FormDialog>
  );
}

export function ContactsEditor({ child }: { child: Child }) {
  const saveChild = useSaveChild();
  return (
    <FormDialog
      title="Emergency contacts"
      description="Private. Only shared when you turn Emergency contacts on."
      trigger={<EditTrigger what="Emergency contacts" />}
      onSave={(form) => {
        const rows = readRows(form, ["name", "relationship", "phone"]);
        const missing = rows.find((r) => !r.phone);
        if (missing) return `Please add a phone number for ${missing.name}.`;
        saveChild({ ...child, emergencyContacts: rows.map((r) => ({ name: r.name, relationship: r.relationship, phone: r.phone })) });
      }}
    >
      <RepeatRows
        itemLabel="Contact"
        addLabel="Add contact"
        columns={[
          { name: "name", label: "Name", wide: true },
          { name: "relationship", label: "Relationship" },
          { name: "phone", label: "Phone", type: "tel" },
        ]}
        initial={child.emergencyContacts.map((c) => ({ name: c.name, relationship: c.relationship, phone: c.phone }))}
      />
    </FormDialog>
  );
}
