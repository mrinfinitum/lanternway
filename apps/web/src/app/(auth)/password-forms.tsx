"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PASSWORD_HINT, PASSWORD_MIN } from "@/lib/password-policy";
import { requestReset, resetPassword } from "./password-actions";

const card = "space-y-4 rounded-2xl bg-card p-5 ring-1 ring-border";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestReset, null);
  const id = useId();
  if (state?.sent) {
    return (
      <div role="status" className={card}>
        <p className="font-bold">Check your email</p>
        <p className="text-sm">
          If there&apos;s a Lanternway account for <strong>{state.email}</strong>, we&apos;ve sent a link to reset your password.
          It works for a short time. Didn&apos;t get it? Check spam, or try again in a minute.
        </p>
        <Link href="/sign-in" className="inline-block text-sm font-bold text-teal underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }
  return (
    <form action={action} noValidate className={card}>
      <div className="space-y-1.5">
        <Label htmlFor={id} className="font-bold">Email</Label>
        <Input id={id} name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state?.email} required className="h-11 bg-white" />
      </div>
      {state?.error && <p role="alert" className="rounded-xl bg-coral/15 px-3 py-2 text-sm font-semibold">{state.error}</p>}
      <Button type="submit" className="h-12 w-full rounded-full text-base" disabled={pending}>
        {pending ? "Sending…" : "Email me a reset link"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/sign-in" className="font-bold text-teal underline-offset-4 hover:underline">Sign in</Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, null);
  const id = useId();
  return (
    <form action={action} noValidate className={card}>
      <input type="hidden" name="token" value={token} />
      <div className="space-y-1.5">
        <Label htmlFor={id} className="font-bold">New password</Label>
        <Input id={id} name="password" type="password" autoComplete="new-password" minLength={PASSWORD_MIN} required className="h-11 bg-white" aria-describedby={`${id}-hint`} />
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
      </div>
      {state?.error && <p role="alert" className="rounded-xl bg-coral/15 px-3 py-2 text-sm font-semibold">{state.error}</p>}
      <Button type="submit" className="h-12 w-full rounded-full text-base" disabled={pending}>
        {pending ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
