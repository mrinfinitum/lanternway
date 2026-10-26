"use client";

import { useActionState, useId, useState, useTransition } from "react";
import { KeyRound, LogOut, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PASSWORD_HINT } from "@/lib/password-policy";
import { changePassword, deleteAccount, signOutEverywhere, type FormState } from "./actions";

function Message({ state }: { state: FormState }) {
  if (state?.error) return <p role="alert" className="rounded-xl bg-coral/15 px-3 py-2 text-sm font-semibold">{state.error}</p>;
  if (state?.done) return <p role="status" className="rounded-xl bg-amber/25 px-3 py-2 text-sm font-semibold">{state.done}</p>;
  return null;
}

function PasswordInput({ label, name, autoComplete, hint }: { label: string; name: string; autoComplete: string; hint?: string }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="font-bold">{label}</Label>
      <Input id={id} name={name} type="password" autoComplete={autoComplete} required className="h-11 bg-white" aria-describedby={hint ? `${id}-hint` : undefined} />
      {hint && <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, null);
  return (
    <form action={action} noValidate className="space-y-3">
      <PasswordInput label="Current password" name="currentPassword" autoComplete="current-password" />
      <PasswordInput label="New password" name="newPassword" autoComplete="new-password" hint={PASSWORD_HINT} />
      <Message state={state} />
      <Button type="submit" variant="outline" className="rounded-full bg-white" disabled={pending}>
        <KeyRound /> {pending ? "Changing…" : "Change password"}
      </Button>
    </form>
  );
}

export function SignOutEverywhereButton() {
  const [pending, start] = useTransition();
  return (
    <Button variant="outline" className="rounded-full bg-white" disabled={pending} onClick={() => start(() => signOutEverywhere())}>
      <LogOut /> {pending ? "Signing out…" : "Sign out on all devices"}
    </Button>
  );
}

export function DeleteAccountForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteAccount, null);
  const id = useId();
  if (!open) {
    return (
      <Button variant="ghost" className="rounded-full text-destructive" onClick={() => setOpen(true)}>
        <Trash2 /> Delete my account…
      </Button>
    );
  }
  return (
    <form action={action} noValidate className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-coral/50">
      <p className="text-sm">
        This permanently deletes your account, your family&apos;s children and their profiles, and your consent records. If
        someone else is also in your family, they keep access and only you are removed. It can&apos;t be undone. You might want
        to download your data first.
      </p>
      <PasswordInput label="Your password" name="password" autoComplete="current-password" />
      <div className="space-y-1.5">
        <Label htmlFor={id} className="font-bold">Type DELETE to confirm</Label>
        <Input id={id} name="confirm" autoComplete="off" className="h-11 bg-white" />
      </div>
      <Message state={state} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ghost" className="rounded-full" onClick={() => setOpen(false)}>Keep my account</Button>
        <Button type="submit" variant="destructive" className="rounded-full" disabled={pending}>
          {pending ? "Deleting…" : "Delete my account"}
        </Button>
      </div>
    </form>
  );
}
