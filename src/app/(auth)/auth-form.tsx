"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PASSWORD_HINT, PASSWORD_MIN } from "@/lib/password-policy";
import type { AuthFormState } from "./actions";

type Mode = "sign-in" | "sign-up";

/** One required agreement checkbox. Links inside open in a new tab so the form isn't lost. */
function Consent({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <label className="flex items-start gap-3">
      <input type="checkbox" name={name} required className="mt-0.5 size-5 shrink-0 accent-teal" />
      <span>{children}</span>
    </label>
  );
}

/** Email + password form for signing in or creating an account. */
export function AuthForm({ mode, action }: { mode: Mode; action: (prev: AuthFormState, form: FormData) => Promise<AuthFormState> }) {
  const [state, formAction, pending] = useActionState(action, null);
  const id = useId();
  const errorId = `${id}-error`;
  const signUp = mode === "sign-up";

  return (
    <form action={formAction} noValidate className="space-y-4 rounded-2xl bg-card p-5 ring-1 ring-border" aria-describedby={state?.error ? errorId : undefined}>
      {signUp && (
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-name`} className="font-bold">
            Your first name
          </Label>
          <Input id={`${id}-name`} name="name" autoComplete="given-name" defaultValue={state?.name} required className="h-11 bg-white" />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-email`} className="font-bold">
          Email
        </Label>
        <Input id={`${id}-email`} name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state?.email} required className="h-11 bg-white" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-password`} className="font-bold">
          Password
        </Label>
        <Input
          id={`${id}-password`}
          name="password"
          type="password"
          autoComplete={signUp ? "new-password" : "current-password"}
          minLength={signUp ? PASSWORD_MIN : undefined}
          aria-describedby={signUp ? `${id}-password-hint` : undefined}
          required
          className="h-11 bg-white"
        />
        {signUp && (
          <p id={`${id}-password-hint`} className="text-xs text-muted-foreground">
            {PASSWORD_HINT}
          </p>
        )}
      </div>
      {signUp && (
        <fieldset className="space-y-2 rounded-xl bg-white p-3 text-sm ring-1 ring-border">
          <legend className="sr-only">Agreements</legend>
          <Consent name="adult">I&apos;m 18 or older and a parent or legal guardian of the children I&apos;ll add, or I have their permission.</Consent>
          <Consent name="terms">
            I agree to the{" "}
            <Link href="/terms" target="_blank" className="font-semibold underline underline-offset-2">
              Terms of Use
            </Link>{" "}
            and{" "}
            <Link href="/privacy" target="_blank" className="font-semibold underline underline-offset-2">
              Privacy Policy
            </Link>
            .
          </Consent>
          <Consent name="healthData">
            I consent to Lanternway storing the health information I choose to enter about my child (like diagnoses,
            medications, therapy, and school needs) to provide the service, as described in the{" "}
            <Link href="/health-data-privacy" target="_blank" className="font-semibold underline underline-offset-2">
              Consumer Health Data Privacy Policy
            </Link>
            .
          </Consent>
          <Consent name="testing">I understand this is a test version and I&apos;ll use made-up details, not real information about my child.</Consent>
        </fieldset>
      )}
      {state?.error && (
        <p id={errorId} role="alert" className="rounded-xl bg-coral/15 px-3 py-2 text-sm font-semibold">
          {state.error}
        </p>
      )}
      <Button type="submit" className="h-12 w-full rounded-full text-base" disabled={pending}>
        {pending ? (signUp ? "Creating your account…" : "Signing in…") : signUp ? "Create account" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {signUp ? "Already have an account? " : "New to Lanternway? "}
        <Link href={signUp ? "/sign-in" : "/sign-up"} className="font-bold text-teal underline-offset-4 hover:underline">
          {signUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
