"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removeChild } from "../kids/new/actions";

/** Remove a child from the family (only for kids saved to the account, not the sample family). */
export function RemoveChild({ childId, name }: { childId: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  return (
    <section aria-label={`Remove ${name}`} className="rounded-2xl border border-dashed p-4 text-sm">
      {confirming ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p role="alert">Remove {name} from your family, including their About Me? This can&apos;t be undone.</p>
          <div className="flex gap-2">
            <Button variant="ghost" className="rounded-full" onClick={() => setConfirming(false)}>
              Keep {name}
            </Button>
            <Button variant="destructive" className="rounded-full" disabled={pending} onClick={() => start(() => removeChild(childId))}>
              {pending ? "Removing…" : `Remove ${name}`}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground">Need to take {name} off your account?</p>
          <Button variant="ghost" className="rounded-full text-destructive" onClick={() => setConfirming(true)}>
            <Trash2 /> Remove {name}…
          </Button>
        </div>
      )}
    </section>
  );
}
