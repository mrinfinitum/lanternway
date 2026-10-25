"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removeAddedChild } from "../kids/new/actions";

/** Only shown for kids added in the prototype. */
export function RemoveChild({ childId, name }: { childId: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  return (
    <section aria-label={`Remove ${name}`} className="rounded-2xl border border-dashed p-4 text-sm">
      {confirming ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p role="alert">Remove {name} and everything added for them? This can&apos;t be undone.</p>
          <div className="flex gap-2">
            <Button variant="ghost" className="rounded-full" onClick={() => setConfirming(false)}>
              Keep {name}
            </Button>
            <Button variant="destructive" className="rounded-full" disabled={pending} onClick={() => start(() => removeAddedChild(childId))}>
              {pending ? "Removing…" : `Remove ${name}`}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground">You added {name} in this prototype.</p>
          <Button variant="ghost" className="rounded-full text-destructive" onClick={() => setConfirming(true)}>
            <Trash2 /> Remove {name}…
          </Button>
        </div>
      )}
    </section>
  );
}
