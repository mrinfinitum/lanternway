"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { joinFamily, signInToJoin } from "./actions";

/** Join now (signed in), or sign up / sign in first and come back here. */
export function JoinButtons({ token, signedInAs }: { token: string; signedInAs: string | null }) {
  const [state, join, pending] = useActionState(joinFamily.bind(null, token), null);

  if (!signedInAs) {
    return (
      <div className="space-y-3">
        <form action={signInToJoin.bind(null, token, "sign-up")}>
          <Button type="submit" size="lg" className="w-full rounded-full">
            Create an account to join
          </Button>
        </form>
        <form action={signInToJoin.bind(null, token, "sign-in")}>
          <Button type="submit" size="lg" variant="outline" className="w-full rounded-full bg-white">
            I already have an account
          </Button>
        </form>
      </div>
    );
  }

  return (
    <form action={join} className="space-y-3">
      {state?.error && (
        <p role="alert" className="rounded-xl bg-coral/15 px-3 py-2 text-sm">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full rounded-full" disabled={pending}>
        {pending ? "Joining…" : "Join the family"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">Signed in as {signedInAs}</p>
    </form>
  );
}
