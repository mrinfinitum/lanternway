"use client";

import { useActionState, useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resendCode, verifyCode, type VerifyState } from "../verify-actions";

export function VerifyForm() {
  const [state, action, pending] = useActionState(verifyCode, null);
  const [resend, setResend] = useState<VerifyState>(null);
  const [resending, startResend] = useTransition();
  const id = useId();
  const message = state?.error ?? resend?.error;

  return (
    <form action={action} noValidate className="space-y-4 rounded-2xl bg-card p-5 ring-1 ring-border">
      <div className="space-y-1.5">
        <Label htmlFor={id} className="font-bold">6-digit code</Label>
        <Input
          id={id}
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          required
          className="h-12 bg-white text-center text-2xl font-extrabold tracking-[0.5em]"
        />
      </div>
      {message && <p role="alert" className="rounded-xl bg-coral/15 px-3 py-2 text-sm font-semibold">{message}</p>}
      {resend?.resent && !message && <p role="status" className="rounded-xl bg-amber/25 px-3 py-2 text-sm font-semibold">A new code is on its way.</p>}
      <Button type="submit" className="h-12 w-full rounded-full text-base" disabled={pending}>
        {pending ? "Checking…" : "Confirm my email"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Didn&apos;t get it? Check spam, or{" "}
        <button
          type="button"
          className="font-bold text-teal underline-offset-4 hover:underline disabled:opacity-60"
          disabled={resending}
          onClick={() => startResend(async () => setResend(await resendCode()))}
        >
          {resending ? "sending…" : "send a new code"}
        </button>
        .
      </p>
    </form>
  );
}
