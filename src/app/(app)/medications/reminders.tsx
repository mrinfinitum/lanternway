"use client";

import { useId, useState, useSyncExternalStore } from "react";
import { BellRing, Pencil, Plus, X } from "lucide-react";
import { FormDialog, SelectField, text } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatTime } from "@/lib/format";
import { reminderDaysLabels, reminderMessage } from "@/lib/schedule";
import type { Medication, MedicationReminder, ReminderChannel, ReminderDays } from "@/lib/types";
import { newId, useRecordActions } from "../_components/records-store";

// Medication reminders: the parent picks times, days, and push or text.
// Saved settings only for now — nothing is sent until sending is switched on.

const NOT_SENDING_YET =
  "Reminders aren't being sent yet. Your settings are saved, and we'll let you know when they switch on. Before anything is sent, we'll ask this device for permission (push) or confirm your number (text).";

/** A sensible first time from the schedule text, e.g. "with dinner" → 6:00 PM. */
function suggestedTimes(schedule = ""): string[] {
  const s = schedule.toLowerCase();
  if (/twice|two times|2x|morning and (evening|night)/.test(s)) return ["07:30", "19:30"];
  if (/dinner|evening|supper/.test(s)) return ["18:00"];
  if (/bed|night/.test(s)) return ["20:00"];
  if (/lunch|noon|midday/.test(s)) return ["12:00"];
  return ["07:30"];
}

const timeZoneHere = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
  } catch {
    return "America/New_York";
  }
};

/** One-line summary of a reminder, e.g. "7:15 AM · Every day · Push". */
export function reminderSummary(r: MedicationReminder): string {
  return [
    r.times.map(formatTime).join(", "),
    reminderDaysLabels[r.days],
    r.channel === "push" ? "Push notification" : "Text message",
    r.status === "paused" ? "Paused" : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Shown on a medication card: the reminder (with Edit) or an Add button. */
export function ReminderRow({
  med,
  reminder,
  childName,
  schedule,
}: {
  med: Medication;
  reminder?: MedicationReminder;
  childName: string;
  schedule?: string;
}) {
  if (!reminder) return null;
  return (
    <div className="flex items-start justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm">
      <span className="flex items-start gap-2">
        <BellRing className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          <span className="font-semibold">Reminder:</span> {reminderSummary(reminder)}
          <span className="block text-xs text-muted-foreground">Saved · not sending yet</span>
        </span>
      </span>
      <ReminderDialog med={med} reminder={reminder} childName={childName} schedule={schedule} />
    </div>
  );
}

function subscribeToStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/** "Want reminders?" card for current medications that don't have one yet. */
export function ReminderPrompt({
  childId,
  childName,
  meds,
  scheduleOf,
}: {
  childId: string;
  childName: string;
  meds: Medication[];
  scheduleOf: (medId: string) => string | undefined;
}) {
  const key = `lw-reminder-prompt-dismissed:${childId}`;
  // "Not now" is remembered on this device. Hidden while rendering on the server.
  const dismissedBefore = useSyncExternalStore(
    subscribeToStorage,
    () => window.localStorage.getItem(key) === "1",
    () => true,
  );
  const [dismissedNow, setDismissedNow] = useState(false);
  const dismissed = dismissedBefore || dismissedNow;

  if (dismissed || meds.length === 0) return null;
  return (
    <section aria-labelledby="reminder-prompt" className="rounded-2xl bg-amber/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white">
            <BellRing className="size-5" aria-hidden />
          </span>
          <div>
            <h2 id="reminder-prompt" className="font-bold">
              Would reminders help?
            </h2>
            <p className="text-sm text-teal/80">
              Get a gentle nudge when it&apos;s time for {childName}&apos;s{" "}
              {meds.length === 1 ? meds[0].name : "medications"}, by push notification or text. Reminders don&apos;t name the
              medication unless you choose to.
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 rounded-full"
          aria-label="Not now"
          onClick={() => {
            window.localStorage.setItem(key, "1");
            setDismissedNow(true);
          }}
        >
          <X />
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {meds.map((m) => (
          <ReminderDialog key={m.id} med={m} childName={childName} schedule={scheduleOf(m.id)} label={meds.length === 1 ? "Set up a reminder" : m.name} />
        ))}
      </div>
    </section>
  );
}

/** Add or edit one medication's reminder. */
export function ReminderDialog({
  med,
  reminder,
  childName,
  schedule,
  label,
  compact,
}: {
  med: Medication;
  reminder?: MedicationReminder;
  childName: string;
  schedule?: string;
  label?: string;
  compact?: boolean;
}) {
  const { save, remove } = useRecordActions();
  const [times, setTimes] = useState<string[]>(reminder?.times ?? suggestedTimes(schedule));
  const [channel, setChannel] = useState<ReminderChannel>(reminder?.channel ?? "push");
  const [named, setNamed] = useState(reminder?.wording === "named");
  const [confirming, setConfirming] = useState(false);
  const ids = useId();

  const trigger = reminder ? (
    <Button size="sm" variant="ghost" className="shrink-0 rounded-full">
      <Pencil /> Edit
    </Button>
  ) : (
    <Button size="sm" variant={compact ? "outline" : "default"} className={compact ? "rounded-full bg-white" : "rounded-full"}>
      {compact ? <BellRing /> : <Plus />} {label ?? "Reminder"}
    </Button>
  );

  return (
    <FormDialog
      title={reminder ? `Reminder for ${med.name}` : `Remind me about ${med.name}`}
      description="Pick when you'd like a nudge. You can change or pause it anytime."
      saveLabel="Save reminder"
      trigger={trigger}
      onOpenChange={(o) => {
        // Start from what's saved each time, so a cancelled edit doesn't linger.
        if (!o) return;
        setTimes(reminder?.times ?? suggestedTimes(schedule));
        setChannel(reminder?.channel ?? "push");
        setNamed(reminder?.wording === "named");
        setConfirming(false);
      }}
      onSave={(form) => {
        const picked = times.map((t) => t.trim()).filter((t) => /^\d{2}:\d{2}$/.test(t));
        if (picked.length === 0) return "Please pick at least one time.";
        const phone = text(form, "phone");
        const digits = phone.replace(/\D/g, "");
        if (channel === "text" && (digits.length < 10 || digits.length > 15)) return "Please add the phone number for text reminders.";
        save("medicationReminders", {
          id: reminder?.id ?? newId("rem"),
          medicationId: med.id,
          times: [...new Set(picked)].sort(),
          days: (text(form, "days") || "every-day") as ReminderDays,
          channel,
          phone: channel === "text" ? phone : undefined,
          wording: named ? "named" : "private",
          status: form.get("paused") === "on" ? "paused" : "active",
          timeZone: timeZoneHere(),
        });
        setConfirming(false);
      }}
      destructive={
        reminder
          ? (close) =>
              confirming ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="rounded-full"
                  onClick={() => {
                    remove("medicationReminders", reminder.id);
                    close();
                  }}
                >
                  Delete reminder
                </Button>
              ) : (
                <Button type="button" variant="ghost" size="sm" className="rounded-full text-destructive" onClick={() => setConfirming(true)}>
                  Delete…
                </Button>
              )
          : undefined
      }
    >
      <fieldset className="space-y-2">
        <legend className="mb-1.5 font-bold">Times</legend>
        {times.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              type="time"
              aria-label={`Reminder time ${i + 1}`}
              value={t}
              onChange={(e) => setTimes(times.map((x, j) => (j === i ? e.target.value : x)))}
              className="h-11 bg-white"
            />
            {times.length > 1 && (
              <Button type="button" variant="ghost" size="icon-lg" className="rounded-full" aria-label={`Remove time ${i + 1}`} onClick={() => setTimes(times.filter((_, j) => j !== i))}>
                <X />
              </Button>
            )}
          </div>
        ))}
        {times.length < 4 && (
          <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={() => setTimes([...times, "12:00"])}>
            <Plus /> Add another time
          </Button>
        )}
      </fieldset>

      <SelectField
        name="days"
        label="Which days"
        required
        defaultValue={reminder?.days ?? "every-day"}
        options={(Object.keys(reminderDaysLabels) as ReminderDays[]).map((d) => ({ value: d, label: reminderDaysLabels[d] }))}
      />

      <fieldset>
        <legend className="mb-1.5 font-bold">How</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["push", "Push notification", "On this phone or computer"],
              ["text", "Text message", "To a phone number"],
            ] as const
          ).map(([value, title, sub]) => (
            <button
              key={value}
              type="button"
              aria-pressed={channel === value}
              onClick={() => setChannel(value)}
              className="rounded-xl border-2 border-transparent bg-cream px-3 py-2 text-left transition-colors hover:border-amber aria-pressed:border-teal"
            >
              <span className="block text-sm font-bold">{title}</span>
              <span className="block text-xs text-muted-foreground">{sub}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {channel === "text" && (
        <div className="space-y-1.5">
          <Label htmlFor={`${ids}-phone`} className="font-bold">
            Phone number
          </Label>
          <Input
            id={`${ids}-phone`}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            defaultValue={reminder?.phone}
            placeholder="(555) 123-4567"
            className="h-11 bg-white"
          />
          <p className="text-xs text-muted-foreground">We&apos;ll confirm this number before sending any texts. Reply STOP anytime to stop them.</p>
        </div>
      )}

      <div className="space-y-2 rounded-xl bg-card p-3 ring-1 ring-border">
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={named} onChange={(e) => setNamed(e.target.checked)} className="mt-0.5 size-4 accent-teal" />
          <span>
            <span className="font-semibold">Show the medication name</span>
            <span className="block text-xs text-muted-foreground">Off by default, since reminders can show on a locked screen.</span>
          </span>
        </label>
        <p className="text-sm">
          <span className="text-muted-foreground">The reminder will say: </span>
          <span className="font-semibold">“{reminderMessage(childName, times[0] || "08:00", med.name, named ? "named" : "private")}”</span>
        </p>
      </div>

      {reminder && (
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="paused" defaultChecked={reminder.status === "paused"} className="size-4 accent-teal" />
          Pause this reminder
        </label>
      )}

      <p className="rounded-xl bg-amber/20 px-3 py-2 text-xs">{NOT_SENDING_YET}</p>
      {confirming && (
        <p role="alert" className="rounded-xl bg-coral/15 px-3 py-2 text-sm">
          Delete this reminder? The medication and its history stay.
        </p>
      )}
    </FormDialog>
  );
}
