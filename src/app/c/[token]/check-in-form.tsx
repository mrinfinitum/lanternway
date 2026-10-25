"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { brandImages } from "@/lib/brand";
import { checkInQuestions } from "@/lib/labels";
import type { CheckInRatings, Rating } from "@/lib/types";

type Answers = Partial<CheckInRatings>;

export function CheckInForm({
  childFirstName,
  respondentName,
  dateLabel,
}: {
  childFirstName: string;
  respondentName: string;
  dateLabel: string;
}) {
  const [answers, setAnswers] = useState<Answers>({});
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const complete = checkInQuestions.every((q) => answers[q.key]);

  if (sent) {
    const { lumiFull } = brandImages;
    return (
      <div role="status" className="flex flex-col items-center rounded-2xl bg-card ring-1 ring-border p-8 text-center">
        <Image {...lumiFull} alt="" className="h-auto w-16" />
        <h1 className="mt-4 text-xl font-extrabold">Thank you, {respondentName}!</h1>
        <p className="mt-2 text-muted-foreground">
          {childFirstName}&apos;s family will see your check-in. You can close this page.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // Stage 2 will save this to the child's timeline.
        if (complete) setSent(true);
      }}
      className="space-y-6"
    >
      <div>
        <p className="text-sm font-semibold text-muted-foreground">{dateLabel}</p>
        <h1 className="text-2xl font-extrabold">How was {childFirstName}&apos;s day?</h1>
        <p className="mt-1 text-muted-foreground">Hi {respondentName} — four quick taps and you&apos;re done.</p>
      </div>

      {checkInQuestions.map((q) => (
        <fieldset key={q.key} className="rounded-2xl bg-card ring-1 ring-border p-4">
          <legend className="sr-only">{q.label}</legend>
          <p className="mb-3 font-bold" aria-hidden>
            {q.label}
          </p>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={answers[q.key] === n}
                aria-label={`${q.label}: ${n} of 5${n === 1 ? ` (${q.low})` : n === 5 ? ` (${q.high})` : ""}`}
                onClick={() => setAnswers({ ...answers, [q.key]: n as Rating })}
                className="h-12 rounded-xl border-2 border-transparent bg-white text-lg font-extrabold transition-colors hover:border-amber aria-pressed:border-teal aria-pressed:bg-amber/50"
              >
                {n}
              </button>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-xs text-muted-foreground" aria-hidden>
            <span>{q.low}</span>
            <span>{q.high}</span>
          </div>
        </fieldset>
      ))}

      <div>
        <Label htmlFor="note" className="mb-2 font-bold">
          Anything to share? (optional)
        </Label>
        <Textarea
          id="note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="A win, something that was tricky, or anything the family should know."
          className="bg-white"
        />
      </div>

      <Button type="submit" size="lg" disabled={!complete} className="h-12 w-full rounded-full text-base">
        Send check-in
      </Button>
    </form>
  );
}
