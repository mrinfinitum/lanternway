"use client";

import { useState } from "react";
import { Ban, Check, Copy, Eye, Link as LinkIcon, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { OnePager } from "./one-pager";
import {
  buildSharedProfile,
  presetFor,
  presets,
  sectionDefs,
  type AboutMeProfile,
  type SectionDef,
  type ShareSelection,
} from "./share";

// Prototype: the link is a placeholder. Stage 2 creates a real revocable link and PDF.
const SAMPLE_LINK = "https://lanternway.co/a/Xk92-mPq7-Lt4w";

const generalDefs = sectionDefs.filter((d) => !d.private);
const privateDefs = sectionDefs.filter((d) => d.private);

export function SharePanel({ profile }: { profile: AboutMeProfile }) {
  const [selection, setSelection] = useState<ShareSelection>(presets[0].selection);
  const [linkOn, setLinkOn] = useState(true);
  const [copied, setCopied] = useState(false);

  const audience = presetFor(selection);
  const shared = buildSharedProfile(profile, selection);
  const generalCount = generalDefs.filter((d) => selection[d.key]).length;
  const noPrivate = privateDefs.every((d) => !selection[d.key]);

  const toggle = (def: SectionDef) => (
    <div key={def.key} className="flex items-center gap-2">
      <Switch
        id={`share-${def.key}`}
        checked={selection[def.key]}
        onCheckedChange={(v) => setSelection({ ...selection, [def.key]: v })}
      />
      <Label htmlFor={`share-${def.key}`}>{def.label}</Label>
    </div>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="shrink-0 rounded-full">
          <Eye /> Share About Me
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto bg-paper sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share {profile.firstName}&apos;s About Me</DialogTitle>
          <DialogDescription>
            A one-page summary for a teacher, sitter, camp, or doctor. Pick who it&apos;s for, then check the
            preview. Only what&apos;s switched on is included.
          </DialogDescription>
        </DialogHeader>

        <fieldset>
          <legend className="mb-2 font-bold">Who is it for?</legend>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p.value}
                type="button"
                aria-pressed={audience === p.value}
                onClick={() => setSelection(p.selection)}
                className="rounded-full border bg-cream px-4 py-2 text-sm font-semibold transition-colors hover:border-amber aria-pressed:border-teal aria-pressed:bg-teal aria-pressed:text-paper"
              >
                {p.label}
              </button>
            ))}
            {!audience && (
              <span className="self-center px-1 text-sm font-semibold text-muted-foreground">Custom</span>
            )}
          </div>
        </fieldset>

        <details className="rounded-2xl bg-cream px-4 py-3">
          <summary className="cursor-pointer font-bold">
            Sections{" "}
            <span className="font-semibold text-muted-foreground">
              · {generalCount} of {generalDefs.length} included
            </span>
          </summary>
          <fieldset className="mt-3 grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">Sections to include</legend>
            {generalDefs.map(toggle)}
          </fieldset>
        </details>

        <fieldset className="rounded-2xl bg-cream p-4">
          <legend className="sr-only">Private information to include</legend>
          <p className="mb-1 flex items-center gap-2 font-bold">
            <Lock className="size-4" aria-hidden /> Private
          </p>
          <p className="mb-3 text-sm text-teal/80">
            Health and contact details stay off unless you turn them on.
            {audience === "medical" && noPrivate && " A doctor's office may want diagnoses, medications, and allergies."}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">{privateDefs.map(toggle)}</div>
        </fieldset>

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
              <p className="mt-2 text-xs text-muted-foreground">
                Prototype: this is a sample link. Sharing goes live in the working version.
              </p>
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

        <section aria-labelledby="share-preview">
          <h3 id="share-preview" className="font-bold">
            Preview
          </h3>
          <p className="mb-2 text-sm text-muted-foreground">This is exactly what someone with the link will see.</p>
          <OnePager profile={shared} />
        </section>
      </DialogContent>
    </Dialog>
  );
}
