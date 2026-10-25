"use client";

import Link from "next/link";
import { useState } from "react";
import { BookHeart, FileText, MessageSquareHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const cards = [
  {
    icon: BookHeart,
    title: "Your child's whole journey, in one place",
    body: "Log daily life, medications, therapies, and school in one timeline — from early childhood into adulthood.",
  },
  {
    icon: MessageSquareHeart,
    title: "Teachers and therapists can check in",
    body: "Send a private link. They tap a few ratings in about 15 seconds — no account needed — and it lands in your timeline.",
  },
  {
    icon: FileText,
    title: "Walk into every meeting prepared",
    body: "Make clear reports for doctor visits, IEP meetings, and therapists. Private by design: no ads, no trackers.",
  },
];

export function IntroCards() {
  const [step, setStep] = useState(0);
  const card = cards[step];
  const last = step === cards.length - 1;

  return (
    <div className="mt-6 flex w-full flex-1 flex-col">
      <section
        aria-live="polite"
        aria-label={`Intro ${step + 1} of ${cards.length}`}
        className="flex min-h-56 flex-col items-center rounded-2xl bg-card ring-1 ring-border p-6"
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-amber/40">
          <card.icon className="size-6" aria-hidden />
        </span>
        <h1 className="mt-4 text-xl font-extrabold">{card.title}</h1>
        <p className="mt-2 text-teal/80">{card.body}</p>
      </section>

      <div className="mt-5 flex justify-center gap-2" aria-hidden>
        {cards.map((c, i) => (
          <span
            key={c.title}
            className={cn("h-2 rounded-full transition-all", i === step ? "w-6 bg-teal" : "w-2 bg-teal/25")}
          />
        ))}
      </div>

      <div className="mt-auto flex gap-3 pt-8">
        {step > 0 && (
          <Button variant="ghost" size="lg" className="h-12 flex-1 rounded-full text-base" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        )}
        {last ? (
          <Button asChild size="lg" className="h-12 flex-1 rounded-full text-base">
            <Link href="/home">Get started</Link>
          </Button>
        ) : (
          <Button size="lg" className="h-12 flex-1 rounded-full text-base" onClick={() => setStep(step + 1)}>
            Next
          </Button>
        )}
      </div>
      {!last && (
        <Link href="/home" className="mt-3 text-sm font-semibold text-muted-foreground underline-offset-4 hover:underline">
          Skip
        </Link>
      )}
    </div>
  );
}
