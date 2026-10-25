"use client";

import { useState } from "react";
import { Ban, Check, Copy, Eye, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { OnePager, type OnePagerData, type OnePagerOptions } from "./one-pager";

// Prototype: the link is a placeholder. Stage 2 creates a real revocable link and PDF.
const SAMPLE_LINK = "https://lanternway.co/a/Xk92-mPq7-Lt4w";

export function SharePanel({ data }: { data: OnePagerData }) {
  const [options, setOptions] = useState<OnePagerOptions>({ diagnoses: true, medications: false, contacts: true });
  const [linkOn, setLinkOn] = useState(true);
  const [copied, setCopied] = useState(false);

  const toggles: { key: keyof OnePagerOptions; label: string }[] = [
    { key: "diagnoses", label: "Diagnoses" },
    { key: "medications", label: "Medications" },
    { key: "contacts", label: "Emergency contacts" },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-amber/20 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-bold">Share a one-page About Me</p>
        <p className="text-sm text-teal/80">
          A private link for teachers, sitters, camps, or the ER. You choose what&apos;s on it, and you can turn it off anytime.
        </p>
      </div>
      <Dialog>
        <DialogTrigger asChild>
          <Button className="shrink-0 rounded-full">
            <Eye /> Preview & share
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90dvh] overflow-y-auto bg-paper sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Share {data.firstName}&apos;s About Me</DialogTitle>
            <DialogDescription>This is exactly what someone with the link will see.</DialogDescription>
          </DialogHeader>

          <fieldset className="grid gap-2 rounded-2xl bg-cream p-4 sm:grid-cols-3">
            <legend className="sr-only">Include</legend>
            {toggles.map((t) => (
              <div key={t.key} className="flex items-center gap-2">
                <Switch
                  id={`opt-${t.key}`}
                  checked={options[t.key]}
                  onCheckedChange={(v) => setOptions({ ...options, [t.key]: v })}
                />
                <Label htmlFor={`opt-${t.key}`}>{t.label}</Label>
              </div>
            ))}
          </fieldset>

          <OnePager data={data} options={options} />

          <div className="rounded-2xl bg-cream p-4">
            <p className="mb-2 flex items-center gap-2 font-bold">
              <LinkIcon className="size-4" aria-hidden /> Private link
            </p>
            {linkOn ? (
              <>
                <p className="rounded-lg bg-paper px-3 py-2 font-mono text-xs break-all">{SAMPLE_LINK}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full bg-paper"
                    onClick={async () => {
                      await navigator.clipboard?.writeText(SAMPLE_LINK);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy link"}
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setLinkOn(false)}>
                    <Ban /> Turn off link
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Sample link — sharing goes live in the working version.</p>
              </>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>Link is off. Anyone who had it can no longer open it.</span>
                <Button size="sm" variant="outline" className="rounded-full bg-paper" onClick={() => setLinkOn(true)}>
                  Make a new link
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
