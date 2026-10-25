"use client";

import { useEffect, useRef } from "react";
import { ChevronDown, Lock } from "lucide-react";

/** Health & safety group: collapsed on phones, open from tablet width up. */
export function HealthDetails({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (ref.current && window.matchMedia("(min-width: 768px)").matches) ref.current.open = true;
  }, []);

  return (
    <details ref={ref} className="group rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
      <summary className="flex cursor-pointer list-none items-start gap-3 [&::-webkit-details-marker]:hidden">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-paper">
          <Lock className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-extrabold">Health & safety</span>
          <span className="block text-sm text-muted-foreground">
            Private. Diagnoses, medications, allergies, and emergency contacts. Only shared if you turn them on.
          </span>
        </span>
        <ChevronDown className="mt-2 size-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{children}</div>
    </details>
  );
}
