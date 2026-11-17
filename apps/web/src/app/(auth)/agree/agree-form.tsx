"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { agree } from "../actions";
import { ConsentBoxes } from "../auth-form";

/** The sign-up agreements on their own, for accounts that don't have them recorded yet. */
export function AgreeForm() {
  const [state, formAction, pending] = useActionState(agree, null);
  return (
    <form action={formAction} noValidate className="space-y-4 rounded-2xl bg-card p-5 ring-1 ring-border">
      <ConsentBoxes />
      {state?.error && (
        <p role="alert" className="rounded-xl bg-coral/15 px-3 py-2 text-sm font-semibold">
          {state.error}
        </p>
      )}
      <Button type="submit" className="h-12 w-full rounded-full text-base" disabled={pending}>
        {pending ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}
