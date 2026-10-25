"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatTime } from "@/lib/format";
import { logKindIcons, logKindOrder } from "@/lib/log-icons";
import {
  appetiteLabels,
  intensityLabels,
  logKindLabels,
  moodLabels,
  ratingLabel,
  sleepQualityLabels,
} from "@/lib/labels";
import type { IsoDate, LogEntry, LogKind, Rating } from "@/lib/types";
import { useLogStore, type NewLogEntry } from "../_components/log-store";

type Props = {
  today: IsoDate;
  childId: string;
  childName: string;
  triggers: string[];
  calmingStrategies: string[];
  todayLogs: LogEntry[];
};

const confirmations: Record<LogKind, string> = {
  mood: "Mood saved.",
  sleep: "Sleep saved.",
  appetite: "Appetite saved.",
  meltdown: "Saved. Hard moments happen — thank you for noting it. It helps you see patterns over time.",
  win: "Win saved! Worth celebrating.",
  note: "Note saved.",
};

const isKind = (value: string | null): value is LogKind =>
  !!value && (logKindOrder as string[]).includes(value);

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function LogForm({ today, childId, childName, triggers, calmingStrategies, todayLogs }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const kindParam = params.get("kind");
  const kind: LogKind = isKind(kindParam) ? kindParam : "mood";
  const { added, addLog } = useLogStore();
  const [saved, setSaved] = useState<LogKind | null>(null);

  const setKind = (next: LogKind) => {
    setSaved(null);
    router.replace(`/log?kind=${next}`, { scroll: false });
  };

  const save = (entry: DistributiveFields) => {
    addLog({ ...entry, childId, date: today, time: nowTime(), loggedBy: "Dana" } as NewLogEntry);
    setSaved(entry.kind);
  };

  const todayAll = [...todayLogs, ...added.filter((l) => l.date === today)];

  return (
    <div className="space-y-6">
      <div role="group" aria-label="What would you like to log?" className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {logKindOrder.map((k) => {
          const Icon = logKindIcons[k];
          return (
            <button
              key={k}
              type="button"
              aria-pressed={k === kind}
              onClick={() => setKind(k)}
              className="flex flex-col items-center gap-1 rounded-2xl bg-card ring-1 ring-foreground/10 px-2 py-3 text-sm font-bold transition-colors hover:bg-amber/30 aria-pressed:bg-teal aria-pressed:text-paper"
            >
              <Icon className="size-5" aria-hidden />
              {logKindLabels[k]}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl bg-card ring-1 ring-foreground/10 p-5">
        {saved === kind ? (
          <Saved message={confirmations[kind]} onAgain={() => setSaved(null)} />
        ) : (
          <>
            {kind === "mood" && <MoodForm childName={childName} onSave={save} />}
            {kind === "sleep" && <SleepForm onSave={save} />}
            {kind === "appetite" && <AppetiteForm onSave={save} />}
            {kind === "meltdown" && (
              <MeltdownForm triggers={triggers} calmingStrategies={calmingStrategies} onSave={save} />
            )}
            {kind === "win" && <TextForm kind="win" childName={childName} onSave={save} />}
            {kind === "note" && <TextForm kind="note" childName={childName} onSave={save} />}
          </>
        )}
      </div>

      <section aria-labelledby="today-heading">
        <h2 id="today-heading" className="mb-2 font-bold">
          Logged today
        </h2>
        {todayAll.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing yet today.</p>
        ) : (
          <ul className="space-y-2">
            {todayAll.map((l) => (
              <li key={l.id} className="flex items-center gap-3 rounded-xl border px-3 py-2 text-sm">
                {(() => {
                  const Icon = logKindIcons[l.kind];
                  return <Icon className="size-4 shrink-0" aria-hidden />;
                })()}
                <span className="flex-1">{describe(l)}</span>
                {l.time && <span className="text-xs text-muted-foreground">{formatTime(l.time)}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function describe(l: LogEntry): string {
  switch (l.kind) {
    case "mood":
      return `Mood: ${ratingLabel(moodLabels, l.rating)}`;
    case "sleep":
      return `Sleep: ${l.hours} hrs, ${l.nightWakings} wake-up${l.nightWakings === 1 ? "" : "s"}`;
    case "appetite":
      return `Appetite: ${ratingLabel(appetiteLabels, l.rating).toLowerCase()}`;
    case "meltdown":
      return `Meltdown: ${l.trigger}, ${l.durationMinutes} min`;
    case "win":
      return `Win: ${l.text}`;
    case "note":
      return `Note: ${l.text}`;
  }
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

type DistributiveFields = NewLogEntry extends infer T
  ? T extends unknown
    ? Omit<T, "childId" | "date" | "time" | "loggedBy">
    : never
  : never;
type OnSave = (entry: DistributiveFields) => void;

function Saved({ message, onAgain }: { message: string; onAgain: () => void }) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 py-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-amber">
        <Check className="size-6" aria-hidden />
      </span>
      <p className="max-w-sm font-semibold">{message}</p>
      <Button variant="ghost" onClick={onAgain}>
        Log another
      </Button>
    </div>
  );
}

function RatingPicker({
  label,
  labels,
  value,
  onChange,
}: {
  label: string;
  labels: readonly string[];
  value: Rating | null;
  onChange: (r: Rating) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 font-bold">{label}</legend>
      <div className="grid grid-cols-5 gap-2">
        {labels.map((text, i) => {
          const rating = (i + 1) as Rating;
          return (
            <button
              key={text}
              type="button"
              aria-pressed={value === rating}
              onClick={() => onChange(rating)}
              className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border-2 border-transparent bg-paper px-1 py-2 text-xs font-semibold leading-tight transition-colors hover:border-amber aria-pressed:border-teal aria-pressed:bg-amber/40"
            >
              <span className="text-base font-extrabold">{rating}</span>
              {text}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function Chips({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 font-bold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={selected.includes(o)}
            onClick={() => onToggle(o)}
            className="rounded-full border bg-paper px-3 py-1.5 text-sm font-semibold transition-colors hover:border-amber aria-pressed:border-teal aria-pressed:bg-teal aria-pressed:text-paper"
          >
            {o}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Stepper({
  label,
  value,
  step,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <p className="mb-2 font-bold" id={`${label}-label`}>
        {label}
      </p>
      <div className="flex items-center gap-3" role="group" aria-labelledby={`${label}-label`}>
        <Button type="button" variant="outline" size="icon-lg" aria-label={`Less ${label.toLowerCase()}`} onClick={() => onChange(Math.max(min, value - step))}>
          <Minus />
        </Button>
        <span className="min-w-20 text-center text-xl font-extrabold" aria-live="polite">
          {value}
          {unit && <span className="ml-1 text-sm font-semibold text-muted-foreground">{unit}</span>}
        </span>
        <Button type="button" variant="outline" size="icon-lg" aria-label={`More ${label.toLowerCase()}`} onClick={() => onChange(Math.min(max, value + step))}>
          <Plus />
        </Button>
      </div>
    </div>
  );
}

function SaveButton({ disabled }: { disabled?: boolean }) {
  return (
    <Button type="submit" size="lg" className="h-12 w-full rounded-full text-base" disabled={disabled}>
      Save
    </Button>
  );
}

function MoodForm({ childName, onSave }: { childName: string; onSave: OnSave }) {
  const [rating, setRating] = useState<Rating | null>(null);
  const [note, setNote] = useState("");
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (rating) onSave({ kind: "mood", rating, note: note || undefined });
      }}
    >
      <RatingPicker label={`How was ${childName}'s mood today?`} labels={moodLabels} value={rating} onChange={setRating} />
      <OptionalNote value={note} onChange={setNote} />
      <SaveButton disabled={!rating} />
    </form>
  );
}

function SleepForm({ onSave }: { onSave: OnSave }) {
  const [hours, setHours] = useState(9);
  const [bedtime, setBedtime] = useState("21:30");
  const [wakeTime, setWakeTime] = useState("06:45");
  const [nightWakings, setNightWakings] = useState(0);
  const [quality, setQuality] = useState<Rating | null>(null);
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ kind: "sleep", hours, bedtime, wakeTime, nightWakings, quality: quality ?? 3 });
      }}
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="bedtime" className="mb-2 font-bold">Bedtime</Label>
          <Input id="bedtime" type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} className="h-11 bg-paper" />
        </div>
        <div>
          <Label htmlFor="wake" className="mb-2 font-bold">Woke up</Label>
          <Input id="wake" type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} className="h-11 bg-paper" />
        </div>
      </div>
      <div className="flex flex-wrap gap-6">
        <Stepper label="Hours asleep" value={hours} step={0.5} min={0} max={14} unit="hrs" onChange={setHours} />
        <Stepper label="Wake-ups" value={nightWakings} step={1} min={0} max={10} onChange={setNightWakings} />
      </div>
      <RatingPicker label="How restful was it? (optional)" labels={sleepQualityLabels} value={quality} onChange={setQuality} />
      <SaveButton />
    </form>
  );
}

function AppetiteForm({ onSave }: { onSave: OnSave }) {
  const [rating, setRating] = useState<Rating | null>(null);
  const [note, setNote] = useState("");
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (rating) onSave({ kind: "appetite", rating, note: note || undefined });
      }}
    >
      <RatingPicker label="How much did they eat today?" labels={appetiteLabels} value={rating} onChange={setRating} />
      <OptionalNote value={note} onChange={setNote} placeholder="e.g. small lunch, big snack after school" />
      <SaveButton disabled={!rating} />
    </form>
  );
}

// Shown after the child's own triggers from their profile.
const commonTriggers = ["Ending screen time", "Tired", "Hungry", "Hard homework", "Waiting"];
const durations = [5, 10, 15, 30, 45, 60];

function MeltdownForm({
  triggers,
  calmingStrategies,
  onSave,
}: {
  triggers: string[];
  calmingStrategies: string[];
  onSave: OnSave;
}) {
  const [trigger, setTrigger] = useState<string | null>(null);
  const [otherTrigger, setOtherTrigger] = useState("");
  const [intensity, setIntensity] = useState<Rating | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [helped, setHelped] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const triggerOptions = [...new Set([...triggers, ...commonTriggers])];
  const finalTrigger = otherTrigger.trim() || trigger;

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!intensity || !duration) return;
        onSave({
          kind: "meltdown",
          trigger: finalTrigger ?? "Not sure",
          intensity,
          durationMinutes: duration,
          whatHelped: helped,
          note: note || undefined,
        });
      }}
    >
      <p className="text-sm text-muted-foreground">
        Hard moments happen. Just jot down what you can — every detail is optional except how big and how long.
      </p>
      <Chips
        label="What seemed to set it off?"
        options={triggerOptions}
        selected={trigger ? [trigger] : []}
        onToggle={(o) => setTrigger(trigger === o ? null : o)}
      />
      <Input
        aria-label="Something else"
        placeholder="Something else…"
        value={otherTrigger}
        onChange={(e) => setOtherTrigger(e.target.value)}
        className="h-11 bg-paper"
      />
      <RatingPicker label="How big was it?" labels={intensityLabels} value={intensity} onChange={setIntensity} />
      <fieldset>
        <legend className="mb-2 font-bold">About how long?</legend>
        <div className="flex flex-wrap gap-2">
          {durations.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={duration === d}
              onClick={() => setDuration(d)}
              className="rounded-full border bg-paper px-4 py-1.5 text-sm font-semibold transition-colors hover:border-amber aria-pressed:border-teal aria-pressed:bg-teal aria-pressed:text-paper"
            >
              {d === 60 ? "60+ min" : `${d} min`}
            </button>
          ))}
        </div>
      </fieldset>
      <Chips
        label="What helped?"
        options={calmingStrategies}
        selected={helped}
        onToggle={(o) => setHelped(helped.includes(o) ? helped.filter((h) => h !== o) : [...helped, o])}
      />
      <OptionalNote value={note} onChange={setNote} />
      <SaveButton disabled={!intensity || !duration} />
    </form>
  );
}

function TextForm({ kind, childName, onSave }: { kind: "win" | "note"; childName: string; onSave: OnSave }) {
  const [text, setText] = useState("");
  const isWin = kind === "win";
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onSave({ kind, text: text.trim() });
      }}
    >
      <div>
        <Label htmlFor="text" className="mb-2 font-bold">
          {isWin ? `What went well for ${childName}?` : "What would you like to remember?"}
        </Label>
        <Textarea
          id="text"
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={isWin ? "Big or small — tried a new food, asked for help, a calm morning…" : "Anything worth noting today"}
          className="bg-paper"
        />
      </div>
      <SaveButton disabled={!text.trim()} />
    </form>
  );
}

function OptionalNote({
  value,
  onChange,
  placeholder = "Anything else? (optional)",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label htmlFor="note" className="mb-2 font-bold">Note</Label>
      <Textarea id="note" rows={2} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="bg-paper" />
    </div>
  );
}
