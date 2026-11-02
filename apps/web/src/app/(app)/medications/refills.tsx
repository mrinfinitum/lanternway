"use client";

import { useId, useState } from "react";
import { BellRing, CalendarClock, Copy, MessageSquareText, Phone, RefreshCw } from "lucide-react";
import { IfAllowed, useAccess } from "@/components/access";
import { Field, SelectField } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatRelativeDays } from "@/lib/format";
import {
  DEFAULT_REFILL_REMINDER_DAYS,
  REFILL_REMINDER_DAYS,
  dialable,
  refillNote,
  refillReminderDate,
  refillReminderDays,
  smsHref,
  telHref,
} from "@lanternway/shared/refills";
import type { IsoDate, Medication } from "@lanternway/shared/types";

// Refill reminders: the family picks how many days ahead (sent by the phone app, once it's out).
// "Ask for a refill" opens the parent's own Messages or Phone app. Lanternway never sends anything.

type Contact = { label: string; name?: string; phone: string };

/** The "Refill due" line on a medication card, with the reminder setting under it. */
export function RefillLine({ med, due, today }: { med: Medication; due: IsoDate; today: IsoDate }) {
  const remindOn = refillReminderDate(due, med.refillReminderDays);
  const days = refillReminderDays(med.refillReminderDays);
  return (
    <div className="space-y-1 rounded-xl bg-white px-3 py-2 text-sm">
      <p className="flex items-start gap-2">
        <CalendarClock className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          Refill due <strong>{formatDate(due)}</strong> ({formatRelativeDays(due, today)})
          {med.pharmacy && <> · {med.pharmacy}</>}
        </span>
      </p>
      <p className="flex items-start gap-2">
        <BellRing className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          {remindOn ? (
            <>
              Refill reminder {days} days before{remindOn >= today && <> ({formatDate(remindOn)})</>}
              <span className="block text-xs text-muted-foreground">Arrives in the Lanternway phone app, once it&apos;s out</span>
            </>
          ) : (
            <span className="text-muted-foreground">Refill reminder off</span>
          )}
        </span>
      </p>
    </div>
  );
}

/** Pharmacy phone and reminder setting, used in the Add and Edit medication forms. */
export function RefillFields({ med }: { med?: Medication }) {
  return (
    <>
      <Field name="pharmacyPhone" label="Pharmacy phone" type="tel" defaultValue={med?.pharmacyPhone} />
      <SelectField
        name="refillReminderDays"
        label="Refill reminder"
        defaultValue={String(refillReminderDays(med?.refillReminderDays))}
        options={[
          ...REFILL_REMINDER_DAYS.map((d) => ({
            value: String(d),
            label: `${d} days before it's due${d === DEFAULT_REFILL_REMINDER_DAYS ? " (usual)" : ""}`,
          })),
          { value: "0", label: "Off" },
        ]}
        hint="Uses Last filled and Days supply. Sent by the Lanternway phone app, once it's out."
      />
    </>
  );
}

/** Reads the refill fields from a medication form. Returns a message when the phone doesn't look right. */
export function readRefillFields(form: FormData): { pharmacyPhone?: string; refillReminderDays: number } | string {
  const pharmacyPhone = String(form.get("pharmacyPhone") ?? "").trim();
  if (pharmacyPhone && !dialable(pharmacyPhone)) return "Please check the pharmacy's phone number.";
  const days = Number(form.get("refillReminderDays") ?? DEFAULT_REFILL_REMINDER_DAYS);
  return {
    pharmacyPhone: pharmacyPhone || undefined,
    refillReminderDays: Number.isInteger(days) && days >= 0 && days <= 30 ? days : DEFAULT_REFILL_REMINDER_DAYS,
  };
}

const isApple = () => typeof navigator !== "undefined" && /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);

/** "Ask for a refill": a note the parent can edit, with Text and Call buttons for the pharmacy and prescriber. */
export function AskForRefill({
  med,
  childName,
  senderName,
  prescriber,
}: {
  med: Medication;
  childName: string;
  senderName?: string;
  prescriber?: { name: string; phone?: string };
}) {
  const { role } = useAccess();
  const noteId = useId();
  const startingNote = () => refillNote({ senderName, childName, medicationName: med.name, isParent: role === "admin" });
  const [note, setNote] = useState(startingNote);
  const [copied, setCopied] = useState(false);

  const contacts: Contact[] = [
    { label: "Pharmacy", name: med.pharmacy, phone: dialable(med.pharmacyPhone) ? med.pharmacyPhone! : "" },
    { label: "Prescriber", name: prescriber?.name, phone: dialable(prescriber?.phone) ? prescriber!.phone! : "" },
  ].filter((c) => c.phone);

  async function copy() {
    try {
      await navigator.clipboard.writeText(note);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) return;
        setNote(startingNote());
        setCopied(false);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="rounded-full bg-white">
          <RefreshCw /> Refill
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ask for a refill of {med.name}</DialogTitle>
          <DialogDescription>
            Text or call from your own phone. You can change the note first. Lanternway doesn&apos;t send anything.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor={noteId} className="font-bold">
            Note
          </Label>
          <Textarea id={noteId} value={note} onChange={(e) => setNote(e.target.value)} rows={4} className="bg-white" />
        </div>

        {contacts.length === 0 ? (
          <p className="rounded-xl bg-card px-3 py-2 text-sm ring-1 ring-border">
            <IfAllowed
              to="edit"
              otherwise="No phone number is saved for the pharmacy or prescriber yet. You can copy the note and send it yourself."
            >
              Add the pharmacy&apos;s phone in Edit, or the prescriber&apos;s in Therapy &amp; care team, to text or call from here.
              You can also copy the note.
            </IfAllowed>
          </p>
        ) : (
          <ul className="space-y-2">
            {contacts.map((c) => (
              <li key={c.label} className="rounded-xl bg-card px-3 py-2 ring-1 ring-border">
                <p className="text-sm">
                  <span className="font-bold">{c.label}</span>
                  {c.name && <> · {c.name}</>}
                  <span className="block text-muted-foreground">{c.phone}</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button asChild size="sm" className="rounded-full">
                    <a href={smsHref(c.phone, note, isApple() ? "ios" : "android")}>
                      <MessageSquareText /> Text
                    </a>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="rounded-full bg-white">
                    <a href={telHref(c.phone)}>
                      <Phone /> Call
                    </a>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
          <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
            {copied ? "Note copied." : ""}
          </p>
          <Button type="button" variant="outline" size="sm" className="rounded-full bg-white" onClick={copy}>
            <Copy /> Copy note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
