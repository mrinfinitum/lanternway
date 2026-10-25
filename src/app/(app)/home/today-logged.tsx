"use client";

import { Check } from "lucide-react";
import { logKindLabels } from "@/lib/labels";
import type { IsoDate, LogEntry } from "@/lib/types";
import { useLogStore } from "../_components/log-store";

/** Chips for what's already been logged today (sample data + this visit). */
export function TodayLogged({ childId, today, serverLogs }: { childId: string; today: IsoDate; serverLogs: LogEntry[] }) {
  const { added } = useLogStore();
  const kinds = [...new Set([...serverLogs, ...added.filter((l) => l.childId === childId && l.date === today)].map((l) => l.kind))];
  if (kinds.length === 0) return null;

  return (
    <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      Logged today:
      {kinds.map((kind) => (
        <span key={kind} className="inline-flex items-center gap-1 rounded-full bg-cream px-2.5 py-0.5 font-semibold text-teal">
          <Check className="size-3.5" aria-hidden />
          {logKindLabels[kind]}
        </span>
      ))}
    </p>
  );
}
