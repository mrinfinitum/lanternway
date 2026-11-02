"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { Ban, Check, Copy, LogOut, Mail, Plus, UserMinus } from "lucide-react";
import { Field, text } from "@/components/form-dialog";
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
import { roleDescriptions, roleLabels, type Family, type FamilyMember, type FamilyRole } from "@lanternway/shared/family-roles";
import type { IsoDate } from "@lanternway/shared/types";
import { cn } from "@/lib/utils";
import { cancelInvite, inviteToFamily, removeFromFamily, setMemberRole } from "./actions";

const ROLE_ORDER: FamilyRole[] = ["view", "log", "admin"];
const DAYS = [7, 30];

const inviteUrl = (token: string) => `${window.location.origin}/join/${token}`;
const kidNames = (kids: string[]) =>
  kids.length === 0 ? "" : kids.length === 1 ? kids[0] : `${kids.slice(0, -1).join(", ")} and ${kids.at(-1)}`;
const familyTitle = (f: Family) => (f.kids.length ? `${kidNames(f.kids)}'s family` : "Your family");

/** Every family this person belongs to: members and roles, and (for admins) invites. */
export function FamilySharing({ families, today }: { families: Family[]; today: IsoDate }) {
  if (families.length === 0) {
    return (
      <EmptyState>
        <p className="font-bold text-teal">Add a child first.</p>
        <p className="mt-1 text-sm">
          Once your child is set up, you can invite family members to see their records.{" "}
          <Link href="/kids/new" className="font-semibold underline underline-offset-2">
            Add a child
          </Link>
        </p>
      </EmptyState>
    );
  }
  return (
    <div className="space-y-6">
      {families.map((f) => (
        <FamilyCard key={f.id} family={f} today={today} />
      ))}
    </div>
  );
}

function FamilyCard({ family, today }: { family: Family; today: IsoDate }) {
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const isAdmin = family.myRole === "admin";
  const admins = family.members.filter((m) => m.role === "admin").length;
  const openInvites = family.invites.filter((i) => !i.acceptedAt && !i.revokedAt && i.expiresAt.slice(0, 10) >= today);

  const run = (job: () => Promise<{ error?: string }>) => {
    setProblem(null);
    start(async () => {
      const r = await job().catch(() => ({ error: "Something went wrong. Please try again." }));
      if (r.error) setProblem(r.error);
    });
  };

  const changeRole = (m: FamilyMember, role: FamilyRole) => {
    if (role === "admin" && !window.confirm(`Make ${nameOf(m)} an admin? They'll be able to invite and remove people, and delete records.`)) return;
    run(() => setMemberRole(family.id, m.userId, role));
  };
  const remove = (m: FamilyMember) => {
    const message = m.isMe
      ? `Leave ${familyTitle(family)}? You'll stop seeing ${kidNames(family.kids) || "their"} records right away.`
      : `Remove ${nameOf(m)}? They'll stop seeing ${kidNames(family.kids) || "the family's"} records right away.`;
    if (window.confirm(message)) run(() => removeFromFamily(family.id, m.userId));
  };

  return (
    <section aria-labelledby={`family-${family.id}`} className="space-y-4 rounded-2xl bg-card p-4 ring-1 ring-border sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={`family-${family.id}`} className="text-lg font-extrabold">
            {familyTitle(family)}
          </h2>
          <p className="text-sm text-muted-foreground">You: {roleLabels[family.myRole]}</p>
        </div>
        {isAdmin && <InviteDialog family={family} />}
      </div>

      {problem && (
        <p role="alert" className="rounded-xl bg-coral/15 px-3 py-2 text-sm">
          {problem}
        </p>
      )}

      <ul className="space-y-2" aria-busy={pending}>
        {family.members.map((m) => {
          const lastAdmin = m.role === "admin" && admins === 1;
          return (
            <li key={m.userId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3">
              <div className="min-w-0">
                <p className="font-bold">
                  {nameOf(m)} {m.isMe && <span className="font-normal text-muted-foreground">(you)</span>}
                </p>
                {m.name && m.email && <p className="truncate text-sm text-muted-foreground">{m.email}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isAdmin && !m.isMe ? (
                  <select
                    aria-label={`What ${nameOf(m)} can do`}
                    value={m.role}
                    disabled={pending || lastAdmin}
                    onChange={(e) => changeRole(m, e.target.value as FamilyRole)}
                    className="h-9 rounded-full border border-input bg-white px-3 text-sm font-semibold outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {ROLE_ORDER.map((r) => (
                      <option key={r} value={r}>
                        {roleLabels[r]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Badge variant={m.role === "admin" ? "default" : "secondary"}>{roleLabels[m.role]}</Badge>
                )}
                {isAdmin && !m.isMe && (
                  <Button size="sm" variant="ghost" className="rounded-full" disabled={pending} onClick={() => remove(m)} aria-label={`Remove ${nameOf(m)}`}>
                    <UserMinus /> Remove
                  </Button>
                )}
                {m.isMe && family.members.length > 1 && !lastAdmin && (
                  <Button size="sm" variant="ghost" className="rounded-full" disabled={pending} onClick={() => remove(m)}>
                    <LogOut /> Leave
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {isAdmin && admins === 1 && family.members.length > 1 && (
        <p className="text-xs text-muted-foreground">
          You&apos;re the only admin. To leave or delete your account, make someone else an admin first.
        </p>
      )}
      {family.members.length === 1 && isAdmin && (
        <p className="text-sm text-muted-foreground">
          Only you so far. Invite someone who helps care for {kidNames(family.kids) || "your child"}.
        </p>
      )}

      {isAdmin && openInvites.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold">Waiting to join</h3>
          <ul className="space-y-2">
            {openInvites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3">
                <div>
                  <p className="font-bold">{i.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {roleLabels[i.role]} · link expires {formatDate(i.expiresAt.slice(0, 10))}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full"
                  disabled={pending}
                  onClick={() => {
                    if (window.confirm(`Turn off ${i.label}'s invite? The link stops working right away.`)) {
                      run(async () => ((await cancelInvite(i.id)).ok ? {} : { error: "Couldn't turn off that invite." }));
                    }
                  }}
                >
                  <Ban /> Revoke
                </Button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">For privacy, Lanternway only shows an invite link once. Lost one? Revoke it and make a new one.</p>
        </div>
      )}
    </section>
  );
}

const nameOf = (m: FamilyMember) => m.name || m.email || "Family member";

/** Invite someone: name, role, how long the link works, consent; then copy the link (shown once). */
function InviteDialog({ family }: { family: Family }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<FamilyRole>("view");
  const [days, setDays] = useState(7);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ token: string; label: string; email: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const errorId = useId();
  const kids = kidNames(family.kids) || "your child";

  const reset = () => {
    setRole("view");
    setDays(7);
    setConsent(false);
    setError(null);
    setCreated(null);
    setCopied(false);
  };

  const submit = (form: FormData) => {
    const label = text(form, "label");
    const email = text(form, "email");
    if (!label) return setError("Add the person's name.");
    if (!consent) return setError(`Please confirm you'd like ${label} to see ${kids}'s records.`);
    setError(null);
    start(async () => {
      const r = await inviteToFamily({ familyId: family.id, label, role, days, consent }).catch(() => ({ error: "Something went wrong. Please try again." }) as { token?: string; error?: string });
      if (r.token) setCreated({ token: r.token, label, email });
      else setError(r.error ?? "Something went wrong. Please try again.");
    });
  };

  const emailHref = (token: string, email: string) => {
    const subject = `Join ${kids}'s family on Lanternway`;
    const body = `Hi! I'm using Lanternway to keep track of ${kids}'s logs, medications, therapy and school. Here's a private invite so you can see them too:\n\n${inviteUrl(token)}\n\nThe link works once and expires in ${days} days.`;
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
        <Button size="sm" className="rounded-full">
          <Plus /> Invite someone
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Invite ready for {created.label}</DialogTitle>
              <DialogDescription>
                Copy it now and send it however you like. For privacy, Lanternway only shows it this once.
              </DialogDescription>
            </DialogHeader>
            <p className="break-all rounded-xl bg-white p-3 text-sm ring-1 ring-border" data-testid="new-invite">
              {inviteUrl(created.token)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                className="rounded-full"
                onClick={async () => {
                  await navigator.clipboard?.writeText(inviteUrl(created.token));
                  setCopied(true);
                }}
              >
                {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy link"}
              </Button>
              <Button asChild variant="outline" className="rounded-full bg-white">
                <a href={emailHref(created.token, created.email)}>
                  <Mail /> Email it
                </a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The link works once. Whoever opens it signs in (or creates an account) and joins as &ldquo;{roleLabels[role]}&rdquo;.
              Send it only to {created.label}.
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
              <DialogTitle>Invite someone</DialogTitle>
              <DialogDescription>They get their own sign-in. You can change what they can do, or remove them, anytime.</DialogDescription>
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
              <Field name="label" label="Their name" required placeholder="e.g. Grandma Jo" maxLength={80} autoComplete="off" />
              <Field
                name="email"
                label="Email"
                type="email"
                maxLength={120}
                autoComplete="off"
                hint="Only used to start an email to them from your device. Lanternway doesn't email them."
              />

              <fieldset>
                <legend className="mb-2 text-sm font-bold">What they can do</legend>
                <div className="space-y-2">
                  {ROLE_ORDER.map((r) => (
                    <button
                      key={r}
                      type="button"
                      aria-pressed={role === r}
                      onClick={() => setRole(r)}
                      className="block w-full rounded-xl border-2 border-transparent bg-cream px-3 py-2 text-left transition-colors hover:border-amber aria-pressed:border-teal"
                    >
                      <span className="block text-sm font-bold">{roleLabels[r]}</span>
                      <span className="block text-xs text-muted-foreground">{roleDescriptions[r]}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-2 text-sm font-bold">Link works for</legend>
                <div className="flex gap-2">
                  {DAYS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={days === d}
                      onClick={() => setDays(d)}
                      className={cn(
                        "h-10 flex-1 rounded-full bg-cream text-sm font-bold transition-colors hover:bg-amber/25",
                        "aria-pressed:bg-teal aria-pressed:text-white",
                      )}
                    >
                      {d} days
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">It works once, and you can revoke it before then.</p>
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
                  I&apos;d like this person to see {kids}&apos;s records in Lanternway: daily logs, medications, therapy, school, About Me,
                  and teacher check-ins.
                </span>
              </label>

              {error && (
                <p id={errorId} role="alert" className="rounded-xl bg-coral/15 px-3 py-2 text-sm">
                  {error}
                </p>
              )}
              <DialogFooter>
                <Button type="button" variant="ghost" className="rounded-full" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="rounded-full" disabled={pending}>
                  {pending ? "Creating…" : "Create invite link"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
