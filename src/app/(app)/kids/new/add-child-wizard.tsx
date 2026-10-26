"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check, Plus } from "lucide-react";
import { Field, SelectField, TextAreaField } from "@/components/form-dialog";
import { TestDataNotice } from "@/components/test-data-notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { draftIntro, type NewChildInput } from "@/lib/child-profile";
import { brandImages } from "@/lib/brand";
import { formatDate } from "@/lib/format";
import { communicationStyleLabels } from "@/lib/labels";
import type { CommunicationStyle, IsoDate, SchoolPlanStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { addChild } from "./actions";

const INTERESTS = ["Animals", "Trains", "Cars and trucks", "Dinosaurs", "Drawing", "Music", "Dancing", "Swimming", "Building and LEGO", "Books", "Video games", "Being outside", "Cooking", "Sports", "Puzzles", "Science", "Superheroes", "Water play"];
const STRENGTHS = ["Great memory", "Creative", "Kind and caring", "Funny", "Loves to help", "Good with numbers", "Notices details", "Honest", "Keeps trying", "Great with animals", "Musical", "Thinks in pictures"];
const HARD = ["Sudden changes", "Waiting", "Loud noises", "Crowds", "Switching activities", "Bright lights", "Some clothes or textures", "New people or places"];
const HELPS = ["A heads-up before changes", "A visual schedule", "A quiet space", "Movement breaks", "Headphones", "A fidget or squishy toy", "Deep pressure", "Extra time to answer", "First-then cards"];
const SENSORY = ["Sensitive to noise", "Seeks movement", "Sensitive to light", "Particular about textures", "Likes deep pressure", "Chews or mouths things"];
const GRADES = ["Not in school yet", "Early intervention", "Preschool", "Pre-K", "Kindergarten", ...Array.from({ length: 12 }, (_, i) => `${ordinal(i + 1)} grade`), "Transition program", "Homeschool", "Other"];
const PLAN_OPTIONS: { value: SchoolPlanStatus; label: string; hint: string }[] = [
  { value: "iep", label: "IEP", hint: "An Individualized Education Program" },
  { value: "504", label: "504 plan", hint: "Accommodations under Section 504" },
  { value: "evaluating", label: "Being evaluated", hint: "The school is assessing now" },
  { value: "none", label: "No plan", hint: "Not right now" },
  { value: "unsure", label: "Not sure", hint: "That's okay, you can update it later" },
];
const STYLE_HINTS: Record<CommunicationStyle, string> = {
  speaking: "Talks in words and sentences",
  "speaking-and-aac": "Mostly words, sometimes a device or cards",
  "limited-speech": "A few words, plus gestures or pictures",
  aac: "A talker app, device, or picture cards",
  nonverbal: "Communicates without words",
};

function ordinal(n: number) {
  return `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;
}

type Answers = NewChildInput;
const start: Answers = {
  firstName: "",
  birthDate: "",
  pronouns: "",
  grade: "",
  schoolName: "",
  planStatus: undefined,
  likes: [],
  strengths: [],
  communicationStyle: "speaking",
  communicationNotes: "",
  sensoryNeeds: [],
  triggers: [],
  calmingStrategies: [],
  aboutMe: "",
};

const STEPS = ["Basics", "School", "Interests", "Strengths", "Communication", "What helps", "Review"] as const;

export function AddChildWizard({ today }: { today: IsoDate }) {
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>(start);
  const [introEdited, setIntroEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  const name = a.firstName.trim() || "your child";

  const set = <K extends keyof Answers>(key: K, value: Answers[K]) => setA((prev) => ({ ...prev, [key]: value }));
  type ListKey = "likes" | "strengths" | "triggers" | "calmingStrategies" | "sensoryNeeds";
  /** Toggle or add an item using the latest state, so quick taps never drop a pick. */
  const listProps = (key: ListKey) => ({
    value: a[key],
    onToggle: (item: string) =>
      setA((prev) => ({ ...prev, [key]: prev[key].includes(item) ? prev[key].filter((v) => v !== item) : [...prev[key], item] })),
    onAdd: (item: string) => setA((prev) => (prev[key].includes(item) ? prev : { ...prev, [key]: [...prev[key], item] })),
  });

  // Move focus to the new step's heading so screen readers announce it.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const go = (next: number) => {
    setError(null);
    if (step === 0 && next > 0) {
      if (!a.firstName.trim()) return setError("Please add a first name.");
      if (!a.birthDate) return setError("Please add a birthday. A close guess is fine for now.");
      if (a.birthDate > today) return setError("The birthday can't be in the future.");
    }
    setStep(next);
  };

  // The intro is drafted from the latest answers until the parent edits it.
  const intro = introEdited ? a.aboutMe : draftIntro(a);

  const save = () =>
    startSaving(async () => {
      const result = await addChild({ ...a, aboutMe: intro });
      if (result?.error) setError(result.error);
    });

  const last = step === STEPS.length - 1;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-muted-foreground" aria-live="polite">
          Step {step + 1} of {STEPS.length} · {STEPS[step]}
        </p>
        <div className="mt-2 flex gap-1.5" aria-hidden>
          {STEPS.map((s, i) => (
            <span key={s} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-teal" : "bg-cream")} />
          ))}
        </div>
      </div>

      <section className="space-y-5 rounded-2xl bg-card p-5 ring-1 ring-border sm:p-6">
        {step === 0 && (
          <>
            <StepHeading refEl={headingRef} title="Let's meet your child" lumi>
              Just the basics. Everything else is optional, and you can change any of it later.
            </StepHeading>
            <TestDataNotice compact />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field name="firstName" label="First name" required value={a.firstName} onChange={(e) => set("firstName", e.target.value)} autoComplete="off" hint="The name they go by." />
              <Field name="birthDate" label="Birthday" type="date" required max={today} value={a.birthDate} onChange={(e) => set("birthDate", e.target.value)} />
            </div>
            <SelectField
              name="pronouns"
              label="Pronouns"
              value={a.pronouns}
              onChange={(e) => set("pronouns", e.target.value)}
              options={[{ value: "", label: "Skip" }, ...["she/her", "he/him", "they/them"].map((p) => ({ value: p, label: p }))]}
            />
          </>
        )}

        {step === 1 && (
          <>
            <StepHeading refEl={headingRef} title={`Where is ${name} in school?`}>
              This sets up the School page. Skip anything that doesn&apos;t apply.
            </StepHeading>
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField name="grade" label="Grade" value={a.grade} onChange={(e) => set("grade", e.target.value)} options={[{ value: "", label: "Choose…" }, ...GRADES.map((g) => ({ value: g, label: g }))]} />
              <Field name="schoolName" label="School or program" value={a.schoolName} onChange={(e) => set("schoolName", e.target.value)} />
            </div>
            <OptionCards
              legend="Is there an IEP or 504 plan?"
              options={PLAN_OPTIONS}
              value={a.planStatus}
              onChange={(v) => set("planStatus", v)}
            />
          </>
        )}

        {step === 2 && (
          <>
            <StepHeading refEl={headingRef} title={`What does ${name} love?`}>
              Favorite things help teachers and sitters connect fast. Pick any, or add your own.
            </StepHeading>
            <ChipPicker label="Interests" suggestions={INTERESTS} {...listProps("likes")} addLabel="Add an interest" />
          </>
        )}

        {step === 3 && (
          <>
            <StepHeading refEl={headingRef} title={`What is ${name} great at?`}>
              Strengths first: this is what people see at the top of {name}&apos;s About Me.
            </StepHeading>
            <ChipPicker label="Strengths" suggestions={STRENGTHS} {...listProps("strengths")} addLabel="Add a strength" />
          </>
        )}

        {step === 4 && (
          <>
            <StepHeading refEl={headingRef} title={`How does ${name} communicate?`}>Pick what fits most days.</StepHeading>
            <OptionCards
              legend="Mostly communicates by"
              options={(Object.keys(STYLE_HINTS) as CommunicationStyle[]).map((s) => ({ value: s, label: communicationStyleLabels[s], hint: STYLE_HINTS[s] }))}
              value={a.communicationStyle}
              onChange={(v) => set("communicationStyle", v)}
            />
            <TextAreaField
              name="communicationNotes"
              label="Tips for talking together"
              rows={3}
              value={a.communicationNotes}
              onChange={(e) => set("communicationNotes", e.target.value)}
              hint="e.g. “Give her time to answer; she's thinking.”"
            />
          </>
        )}

        {step === 5 && (
          <>
            <StepHeading refEl={headingRef} title={`What's hard for ${name}, and what helps?`}>
              No judgment here. Hard things are part of everyone&apos;s day. This helps others plan ahead.
            </StepHeading>
            <ChipPicker label="Things that are hard" suggestions={HARD} {...listProps("triggers")} addLabel="Add something hard" />
            <ChipPicker label="What helps" suggestions={HELPS} {...listProps("calmingStrategies")} addLabel="Add something that helps" />
            <ChipPicker label="Sensory needs" suggestions={SENSORY} {...listProps("sensoryNeeds")} addLabel="Add a sensory need" />
          </>
        )}

        {step === 6 && (
          <>
            <StepHeading refEl={headingRef} title={`Here's ${name}!`} lumi>
              We drafted an intro in {name}&apos;s voice from your answers. Change anything you like.
            </StepHeading>
            <TextAreaField
              name="aboutMe"
              label="Intro"
              rows={4}
              value={intro}
              onChange={(e) => {
                setIntroEdited(true);
                set("aboutMe", e.target.value);
              }}
              hint="This is shared in every summary, so leave health details out."
            />
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Summary label="Birthday" value={a.birthDate ? formatDate(a.birthDate) : undefined} />
              <Summary label="School" value={[a.grade, a.schoolName].filter(Boolean).join(" · ")} />
              <Summary label="Plan" value={PLAN_OPTIONS.find((p) => p.value === a.planStatus)?.label} />
              <Summary label="Communicates by" value={communicationStyleLabels[a.communicationStyle]} />
              <Summary label="Loves" value={a.likes.join(", ")} />
              <Summary label="Strengths" value={a.strengths.join(", ")} />
              <Summary label="Hard" value={a.triggers.join(", ")} />
              <Summary label="What helps" value={a.calmingStrategies.join(", ")} />
            </dl>
            <p className="text-xs text-muted-foreground">
              Diagnoses, medications, allergies, and contacts can be added later in the private Health &amp; safety section.
            </p>
          </>
        )}

        {error && (
          <p role="alert" className="rounded-xl bg-coral/15 px-3 py-2 text-sm font-semibold">
            {error}
          </p>
        )}
      </section>

      <div className="flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button variant="ghost" className="h-11 rounded-full" onClick={() => go(step - 1)}>
            <ArrowLeft /> Back
          </Button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          {step > 0 && !last && (
            <Button variant="ghost" className="h-11 rounded-full" onClick={() => go(step + 1)}>
              Skip
            </Button>
          )}
          {last ? (
            <Button className="h-11 rounded-full px-6" onClick={save} disabled={saving}>
              <Check /> {saving ? "Adding…" : `Add ${a.firstName.trim() || "child"}`}
            </Button>
          ) : (
            <Button className="h-11 rounded-full px-6" onClick={() => go(step + 1)}>
              Next <ArrowRight />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepHeading({
  title,
  children,
  refEl,
  lumi,
}: {
  title: string;
  children: React.ReactNode;
  refEl: React.RefObject<HTMLHeadingElement | null>;
  lumi?: boolean;
}) {
  const { lumiPeeking } = brandImages;
  return (
    <div className="flex items-start gap-3">
      {lumi && <Image {...lumiPeeking} alt="" className="h-auto w-12 shrink-0" />}
      <div>
        <h2 ref={refEl} tabIndex={-1} className="text-xl font-extrabold outline-none sm:text-2xl">
          {title}
        </h2>
        <p className="mt-1 text-sm text-teal/80">{children}</p>
      </div>
    </div>
  );
}

/** Pick any number of suggestions, or add your own. */
function ChipPicker({
  label,
  suggestions,
  value,
  onToggle,
  onAdd,
  addLabel,
}: {
  label: string;
  suggestions: string[];
  value: string[];
  onToggle: (item: string) => void;
  onAdd: (item: string) => void;
  addLabel: string;
}) {
  const [custom, setCustom] = useState("");
  const all = [...suggestions, ...value.filter((v) => !suggestions.includes(v))];
  const toggle = onToggle;
  const add = () => {
    const item = custom.trim();
    if (item) onAdd(item);
    setCustom("");
  };
  return (
    <fieldset>
      <legend className="mb-2 font-bold">
        {label} <span className="font-normal text-muted-foreground">({value.length} picked)</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {all.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={value.includes(item)}
            onClick={() => toggle(item)}
            className="inline-flex items-center gap-1 rounded-full border bg-white px-3.5 py-2 text-sm font-semibold transition-colors hover:border-amber aria-pressed:border-teal aria-pressed:bg-teal aria-pressed:text-paper"
          >
            {value.includes(item) && <Check className="size-3.5" aria-hidden />}
            {item}
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Input
          aria-label={addLabel}
          placeholder={`${addLabel}…`}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className="h-10 bg-white"
          maxLength={80}
        />
        <Button type="button" variant="outline" className="h-10 rounded-full bg-white" onClick={add} disabled={!custom.trim()}>
          <Plus /> Add
        </Button>
      </div>
    </fieldset>
  );
}

/** One-choice option cards (radio semantics via aria-pressed buttons, like the report picker). */
function OptionCards<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: { value: T; label: string; hint: string }[];
  value?: T;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 font-bold">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className="rounded-2xl border-2 border-transparent bg-cream p-3 text-left transition-colors hover:border-amber aria-pressed:border-teal"
          >
            <span className="block font-extrabold">{o.label}</span>
            <span className="block text-sm text-muted-foreground">{o.hint}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Summary({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2">
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{value || "—"}</dd>
    </div>
  );
}
