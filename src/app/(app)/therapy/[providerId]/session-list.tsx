"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatWeekdayDate } from "@/lib/format";
import type { TherapySession } from "@/lib/types";

const PAGE = 8;

export function SessionList({
  sessions,
  goalTitles,
}: {
  sessions: TherapySession[];
  goalTitles: Record<string, string>;
}) {
  const [shown, setShown] = useState(PAGE);
  if (sessions.length === 0) return <p className="text-muted-foreground">No sessions logged yet.</p>;

  return (
    <div>
      <ol className="space-y-3">
        {sessions.slice(0, shown).map((s) => (
          <li key={s.id} className="rounded-2xl border p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-bold">{formatWeekdayDate(s.date)}{s.date.slice(0, 4) !== sessions[0].date.slice(0, 4) && `, ${s.date.slice(0, 4)}`}</p>
              <p className="text-xs text-muted-foreground">{s.durationMinutes} min</p>
            </div>
            <p className="mt-1">{s.summary}</p>
            {s.goalIds.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Worked on: {s.goalIds.map((id) => goalTitles[id]).filter(Boolean).join(", ")}
              </p>
            )}
            {s.practiceAtHome && (
              <p className="mt-2 rounded-xl bg-amber/20 px-3 py-2 text-sm">
                <span className="font-semibold">To try at home: </span>
                {s.practiceAtHome}
              </p>
            )}
          </li>
        ))}
      </ol>
      {shown < sessions.length && (
        <Button variant="outline" className="mt-4 w-full rounded-full" onClick={() => setShown(shown + PAGE)}>
          Show older sessions ({sessions.length - shown} more)
        </Button>
      )}
    </div>
  );
}
