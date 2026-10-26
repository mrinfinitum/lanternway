"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { Ban, Check, Copy, ExternalLink, Mail, Plus } from "lucide-react";
import { Field, SelectField, text } from "@/components/form-dialog";
import { EmptyState } from "@/components/lumi-tip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";
import { respondentRoleLabels } from "@/lib/labels";
import type { CheckInLink, CheckInRespondent, IsoDate, RespondentRole } from "@/lib/types";
import { cn } from "@/lib/utils";
import { createLink, revokeLink } from "./check-in-actions";

type Row = CheckInLink & { name: string; role: string };

const LIFETIMES = [
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 180, label: "180 days" },
];
const roleOptions = (Object.keys(respondentRoleLabels) as RespondentRole[]).map((r) => ({ value: r, label: respondentRoleLabels[r] }));

const linkUrl = (token: string) => `${window.location.origin}/c/${token}`;

/**
 * Check-in links: ask a teacher or therapist for quick check-ins, copy the new
 * link (shown once), and revoke. For the sample family, revoking lasts for the visit.
 */
export function CheckInLinks({
  childId,
  childName,
  saved,
  links,
  respondents,
  today,
}: {
  childId: string;
  childName: string;
  /** One of the family's own kids (links are real), not the sample family. */
  saved: boolean;
  links: Row[];
  respondents: CheckInRespondent[];
  today: IsoDate;
}) {
  const [revoked, setRevoked] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [, startRevoke] = useTransition();

  const status = (l: Row) => {
    if (l.revokedAt || revoked.includes(l.id)) return "Revoked";
    if (l.expiresAt.slice(0, 10) < today) return "Expired";
    return "Active";
  };
  const sorted = [...links].sort((a, b) => Number(status(b) === "Active") - Number(status(a) === "Active"));

  const copy = async (token: string) => {
    await navigator.clipboard?.writeText(linkUrl(token));
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  const revoke = (l: Row) => {
    if (!window.confirm(`Turn off ${l.name}'s link? It stops working right away. Check-ins they already sent stay in ${childName}'s record.`)) return;
    setRevoked((r) => [...r, l.id]);
    if (saved) startRevoke(async () => void (await revokeLink(l.id)));
  };

  return (
    <div className="space-y-3">
      {saved ? (
        <NewLink childId={childId} childName={childName} respondents={respondents} />
      ) : (
        <p className="text-sm text-muted-foreground">These are sample links. Add your own child to send real ones.</p>
      )}

      {sorted.length === 0 ? (
        <EmptyState>
          <p className="font-bold text-teal">No check-in links yet.</p>
          <p className="mt-1 text-sm">
            Send one to {childName}&apos;s teacher, aide, or therapist. They tap four ratings and an optional note, no account needed.
          </p>
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {sorted.map((l) => {
            const s = status(l);
            const active = s === "Active";
            return (
              <li key={l.id} className="rounded-2xl bg-card ring-1 ring-border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{l.name}</p>
                    <p className="text-sm text-muted-foreground">{l.role}</p>
                  </div>
                  <Badge variant={active ? "default" : "secondary"} className={active ? "" : "bg-white"}>
                    {s}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Created {formatDate(l.createdAt.slice(0, 10))} ·{" "}
                  {s === "Revoked" ? "No longer works" : `${active ? "Expires" : "Expired"} ${formatDate(l.expiresAt.slice(0, 10))}`}
                  {l.lastUsedAt && ` · Last check-in ${formatDate(l.lastUsedAt.slice(0, 10))}`}
                </p>
                {active && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {l.token && (
                      <>
                        <Button asChild size="sm" variant="outline" className="rounded-full bg-white">
                          <Link href={`/c/${l.token}`} target="_blank">
                            <ExternalLink /> Preview form
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-full bg-white" onClick={() => copy(l.token!)}>
                          {copied === l.token ? <Check /> : <Copy />} {copied === l.token ? "Copied" : "Copy link"}
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" className="rounded-full" onClick={() => revoke(l)}>
                      <Ban /> Revoke
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {saved && links.length > 0 && (
        <p className="text-xs text-muted-foreground">
          For privacy, Lanternway only shows a link once, when you create it. Lost one? Revoke it and make a new one.
        </p>
      )}
    </div>
  );
}

/** "Ask for check-ins": pick or add a person, choose how long the link works, consent, then copy it. */
function NewLink({ childId, childName, respondents }: { childId: string; childName: string; respondents: CheckInRespondent[] }) {
  const [open, setOpen] = useState(false);
  const [who, setWho] = useState<string>("new");
  const [days, setDays] = useState(90);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ token: string; name: string; email: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const errorId = useId();

  const reset = () => {
    setWho(respondents.length ? respondents.at(-1)!.id : "new");
    setDays(90);
    setConsent(false);
    setError(null);
    setCreated(null);
    setCopied(false);
  };

  const submit = (form: FormData) => {
    const existing = respondents.find((r) => r.id === who);
    const name = existing?.name ?? text(form, "name");
    const email = existing?.email ?? text(form, "email");
    if (!existing && !name) return setError("Add the person's name.");
    if (!consent) return setError(`Please confirm you'd like to ask ${name} for check-ins about ${childName}.`);
    setError(null);
    start(async () => {
      const result = await createLink({
        childId,
        consent,
        days,
        ...(existing
          ? { respondentId: existing.id }
          : { respondent: { name, role: text(form, "role") as RespondentRole, email: email || undefined } }),
      }).catch(() => ({ error: "Something went wrong. Please try again." }) as { token?: string; error?: string });
      if (result.token) setCreated({ token: result.token, name, email });
      else setError(result.error ?? "Something went wrong. Please try again.");
    });
  };

  const copy = async () => {
    if (!created) return;
    await navigator.clipboard?.writeText(linkUrl(created.token));
    setCopied(true);
  };

  const emailHref = (token: string, email: string) => {
    const subject = `Quick check-ins for ${childName}`;
    const body = `Hi! Here's a private link for quick check-ins about ${childName}. It takes about 30 seconds: four ratings and an optional note, no account needed.\n\n${linkUrl(token)}\n\nThank you!`;
    return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className="rounded-full">
          <Plus /> Ask for check-ins
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Link ready for {created.name}</DialogTitle>
              <DialogDescription>
                Copy it now and send it however you like. For privacy, Lanternway only shows it this once.
              </DialogDescription>
            </DialogHeader>
            <p className="break-all rounded-xl bg-white p-3 text-sm ring-1 ring-border" data-testid="new-link">
              {linkUrl(created.token)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button className="rounded-full" onClick={copy}>
                {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy link"}
              </Button>
              <Button asChild variant="outline" className="rounded-full bg-white">
                <a href={emailHref(created.token, created.email)}>
                  <Mail /> Email it
                </a>
              </Button>
              <Button asChild variant="outline" className="rounded-full bg-white">
                <Link href={`/c/${created.token}`} target="_blank">
                  <ExternalLink /> Preview form
                </Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {created.name} will only see a short form with {childName}&apos;s first name. Never {childName}&apos;s record.
            </p>
            <DialogFooter>
              <Button variant="ghost" className="rounded-full" onClick={() => setOpen(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Ask for check-ins</DialogTitle>
              <DialogDescription>
                A private link for one person. It opens a 30-second form about {childName}&apos;s day: focus, mood, behavior,
                participation, and an optional note.
              </DialogDescription>
            </DialogHeader>
            <form
              noValidate
              aria-describedby={error ? errorId : undefined}
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                submit(new FormData(e.currentTarget));
              }}
            >
              {respondents.length > 0 && (
                <SelectField
                  name="who"
                  label="Who is it for?"
                  required
                  value={who}
                  onChange={(e) => setWho(e.target.value)}
                  options={[
                    ...respondents.map((r) => ({ value: r.id, label: `${r.name} · ${respondentRoleLabels[r.role]}` })),
                    { value: "new", label: "Someone new" },
                  ]}
                />
              )}
              {who === "new" && (
                <>
                  <Field name="name" label="Their name" required placeholder="e.g. Ms. Park" maxLength={80} autoComplete="off" />
                  <SelectField name="role" label="Role" required options={roleOptions} defaultValue="classroom-teacher" />
                  <Field
                    name="email"
                    label="Email"
                    type="email"
                    maxLength={120}
                    autoComplete="off"
                    hint="Only used to start an email to them from your device. Lanternway doesn't email them."
                  />
                </>
              )}

              <fieldset>
                <legend className="mb-2 text-sm font-bold">Link works for</legend>
                <div className="flex gap-2">
                  {LIFETIMES.map((l) => (
                    <button
                      key={l.days}
                      type="button"
                      aria-pressed={days === l.days}
                      onClick={() => setDays(l.days)}
                      className={cn(
                        "h-10 flex-1 rounded-full bg-cream text-sm font-bold transition-colors hover:bg-amber/25",
                        "aria-pressed:bg-teal aria-pressed:text-white",
                      )}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">You can revoke it any time.</p>
              </fieldset>

              <label className="flex items-start gap-3 rounded-xl bg-white p-3 text-sm leading-snug ring-1 ring-border">
                <input
                  type="checkbox"
                  name="consent"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 size-5 shrink-0 accent-teal"
                />
                <span>
                  I&apos;d like to ask this person for check-ins about {childName}. Their ratings and notes will be saved to{" "}
                  {childName}&apos;s record. They&apos;ll see {childName}&apos;s first name and nothing else.
                </span>
              </label>

              {error && (
                <p id={errorId} role="alert" className="rounded-xl bg-coral/15 px-3 py-2 text-sm font-semibold text-teal">
                  {error}
                </p>
              )}
              <DialogFooter className="flex-row justify-end gap-2">
                <Button type="button" variant="ghost" className="rounded-full" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="rounded-full px-5" disabled={pending}>
                  {pending ? "Creating…" : "Create link"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
