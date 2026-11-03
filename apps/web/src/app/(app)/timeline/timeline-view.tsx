"use client";

import { useMemo, useState } from "react";
import {
  Baby,
  CalendarDays,
  ClipboardCheck,
  HeartHandshake,
  Pill,
  School,
  Sparkles,
  Star,
  Stethoscope,
  StickyNote,
  Flag,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { formatTime, formatWeekdayDate } from "@lanternway/shared/format";
import { logEvent, timelineView, zoomOptions, type TimelineEvent, type Zoom } from "@lanternway/shared/timeline";
import type { IsoDate } from "@lanternway/shared/types";
import { cn } from "@/lib/utils";
import { useLogStore } from "../_components/log-store";

const categoryStyle: Record<TimelineEvent["category"], { icon: LucideIcon; className: string }> = {
  diagnosis: { icon: Flag, className: "bg-teal text-paper" },
  medication: { icon: Pill, className: "bg-coral/40 text-teal" },
  school: { icon: School, className: "bg-teal/15 text-teal" },
  therapy: { icon: HeartHandshake, className: "bg-teal/15 text-teal" },
  milestone: { icon: Baby, className: "bg-amber text-teal" },
  win: { icon: Star, className: "bg-amber text-teal" },
  meltdown: { icon: Waves, className: "bg-white text-teal ring-1 ring-border" },
  "check-in": { icon: ClipboardCheck, className: "bg-teal/15 text-teal" },
  note: { icon: StickyNote, className: "bg-white text-teal ring-1 ring-border" },
  visit: { icon: Stethoscope, className: "bg-coral/40 text-teal" },
  day: { icon: CalendarDays, className: "bg-white text-muted-foreground ring-1 ring-border" },
};

export function TimelineView({
  events,
  today,
  birthDate,
}: {
  events: TimelineEvent[];
  today: IsoDate;
  birthDate: IsoDate;
}) {
  const [zoom, setZoom] = useState<Zoom>("month");
  const { added } = useLogStore();

  const all = useMemo(() => {
    // Entries logged during this visit show up too.
    const local = added.map(logEvent).filter((e): e is TimelineEvent => e !== null);
    return [...events, ...local];
  }, [events, added]);

  const { upcoming, groups } = timelineView(all, zoom, today, birthDate);

  return (
    <div>
      <div role="group" aria-label="Zoom" className="sticky top-16 z-20 -mx-4 mb-6 bg-background/95 px-4 py-2 backdrop-blur md:static md:mx-0 md:px-0">
        <div className="grid grid-cols-4 gap-1 rounded-full bg-cream p-1">
          {zoomOptions.map((o) => (
            <button
              key={o.value}
              type="button"
              aria-pressed={zoom === o.value}
              onClick={() => setZoom(o.value)}
              className="rounded-full py-2 text-sm font-bold text-teal/80 transition-colors aria-pressed:bg-teal aria-pressed:text-paper"
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {upcoming.length > 0 && (
        <section aria-labelledby="upcoming" className="mb-8 rounded-2xl bg-amber/20 p-4">
          <h2 id="upcoming" className="mb-2 flex items-center gap-2 font-bold">
            <Sparkles className="size-4" aria-hidden /> Coming up
          </h2>
          <ul className="space-y-1 text-sm">
            {upcoming.map((e) => (
              <li key={e.id}>
                <span className="font-semibold">{formatWeekdayDate(e.date)}, {e.date.slice(0, 4)}:</span> {e.title}
              </li>
            ))}
          </ul>
        </section>
      )}

      {groups.length === 0 && <p className="text-muted-foreground">Nothing recorded in this period.</p>}

      <ol className="space-y-6">
        {groups.map((g) => (
          <li key={g.key}>
            <h2 className="mb-3 text-sm font-extrabold tracking-wide text-muted-foreground uppercase">{g.label}</h2>
            <ol className="relative space-y-3 border-l-2 border-border pl-6">
              {g.items.map((e) => {
                const style = categoryStyle[e.category];
                return (
                  <li key={e.id} className="relative">
                    <span
                      className={cn(
                        "absolute top-0.5 -left-[2.45rem] flex size-7 items-center justify-center rounded-full",
                        style.className,
                      )}
                      aria-hidden
                    >
                      <style.icon className="size-3.5" />
                    </span>
                    <div className={cn(e.level === "summary" ? "text-sm text-muted-foreground" : "")}>
                      <p className={cn(e.level !== "summary" && "font-bold", e.level === "major" && "text-base")}>
                        {e.title}
                        {e.time && e.time !== "00:00" && zoom !== "all" && zoom !== "year" && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">{formatTime(e.time)}</span>
                        )}
                      </p>
                      {e.detail && <p className="text-sm text-muted-foreground">{e.detail}</p>}
                      {(zoom === "all" || zoom === "year") && (
                        <p className="text-xs text-muted-foreground">{formatWeekdayDate(e.date)}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ol>
    </div>
  );
}
