"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { FileText, School, Stethoscope, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addDays } from "@/lib/dates";
import type { IsoDate } from "@/lib/types";
import { isReportType, rangePresets, reportTypes, type ReportType } from "./report-types";

const icons: Record<ReportType, typeof FileText> = { doctor: Stethoscope, iep: School, therapist: HeartHandshake };

export function ReportPicker({ today }: { today: IsoDate }) {
  const params = useSearchParams();
  const initial = params.get("type");
  const [type, setType] = useState<ReportType>(isReportType(initial) ? initial : "doctor");
  const [days, setDays] = useState<number | "custom">(90);
  const [from, setFrom] = useState(addDays(today, -89));
  const [to, setTo] = useState(today);

  const range = days === "custom" ? { from, to } : { from: addDays(today, -(days - 1)), to: today };
  const valid = range.from <= range.to;
  const href = `/reports/view?type=${type}&from=${range.from}&to=${range.to}`;

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-3 font-bold">What&apos;s it for?</legend>
        <div className="space-y-2">
          {reportTypes.map((t) => {
            const Icon = icons[t.value];
            return (
              <button
                key={t.value}
                type="button"
                aria-pressed={type === t.value}
                onClick={() => setType(t.value)}
                className="flex w-full items-start gap-3 rounded-2xl border-2 border-transparent bg-cream p-4 text-left transition-colors hover:border-amber aria-pressed:border-teal"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-extrabold">{t.title}</span>
                  <span className="block text-sm text-muted-foreground">{t.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 font-bold">Which dates?</legend>
        <div className="flex flex-wrap gap-2">
          {[...rangePresets.map((p) => ({ value: p.days as number | "custom", label: p.label })), { value: "custom" as const, label: "Custom" }].map((p) => (
            <button
              key={p.label}
              type="button"
              aria-pressed={days === p.value}
              onClick={() => setDays(p.value)}
              className="rounded-full border bg-cream px-4 py-2 text-sm font-semibold transition-colors hover:border-amber aria-pressed:border-teal aria-pressed:bg-teal aria-pressed:text-paper"
            >
              {p.label}
            </button>
          ))}
        </div>
        {days === "custom" && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="from" className="mb-1">From</Label>
              <Input id="from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-11 bg-white" />
            </div>
            <div>
              <Label htmlFor="to" className="mb-1">To</Label>
              <Input id="to" type="date" value={to} max={today} onChange={(e) => setTo(e.target.value)} className="h-11 bg-white" />
            </div>
          </div>
        )}
      </fieldset>

      <Button asChild size="lg" className="h-12 w-full rounded-full text-base" aria-disabled={!valid}>
        <Link href={valid ? href : "#"}>
          <FileText /> Create report
        </Link>
      </Button>
    </div>
  );
}
