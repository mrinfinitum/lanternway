"use client";

import { useMemo, useState } from "react";
import { BellRing, CalendarClock, ChevronLeft, ChevronRight, HeartHandshake, Pill, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { addDays, dayOfWeek, parseIsoDate } from "@lanternway/shared/dates";
import { formatLongWeekday, formatMonthYear, formatTime } from "@/lib/format";
import { refillDueDate } from "@/lib/insights";
import { providerTypeLabels } from "@lanternway/shared/labels";
import { parseWeeklySchedule, reminderOn } from "@/lib/schedule";
import type { IsoDate, Medication, MedicationChange, MedicationReminder, Provider, TherapySession } from "@lanternway/shared/types";
import { cn } from "@/lib/utils";
import { useRecords } from "./records-store";

// A month calendar of medications and therapy. Shows what's recorded and what
// repeats: daily doses, reminder times, dose changes, refills, logged sessions,
// and upcoming weekly appointments read from the care team's schedules.

export type CalendarSession = Pick<TherapySession, "id" | "providerId" | "date" | "durationMinutes" | "summary">;

type Layer = "meds" | "therapy";

type DayItem = {
  id: string;
  layer: Layer;
  /** "dose" = scheduled that day; "event" = change or refill; "session" = logged; "planned" = from the schedule. */
  type: "dose" | "event" | "session" | "planned";
  title: string;
  detail?: string;
  time?: string;
};

const isVisit = (p?: Provider) => p?.type === "psychiatry" || p?.type === "pediatrics";

export function CareCalendar({
  childId,
  childName,
  today,
  medications,
  changes,
  reminders,
  providers,
  sessions,
  initialLayers,
}: {
  childId: string;
  childName: string;
  today: IsoDate;
  medications: Medication[];
  changes: MedicationChange[];
  reminders: MedicationReminder[];
  providers: Provider[];
  sessions: CalendarSession[];
  initialLayers: Layer[];
}) {
  const meds = useRecords("medications", medications).filter((m) => m.childId === childId);
  const allChanges = useRecords("medicationChanges", changes);
  const allReminders = useRecords("medicationReminders", reminders);
  const team = useRecords("providers", providers).filter((p) => p.childId === childId);

  const [layers, setLayers] = useState<Layer[]>(initialLayers);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState<IsoDate>(today);

  const itemsOn = useMemo(() => {
    const historyOf = (id: string) =>
      allChanges.filter((c) => c.medicationId === id).sort((a, b) => a.date.localeCompare(b.date));
    const schedules = team.map((p) => ({ p, weekly: parseWeeklySchedule(p.schedule) }));
    const teamById = new Map(team.map((p) => [p.id, p]));

    return (date: IsoDate): DayItem[] => {
      const out: DayItem[] = [];

      // Medications: the dose taken that day, its reminder times, and any change or refill.
      for (const m of meds) {
        const history = historyOf(m.id);
        const latest = history.filter((c) => c.date <= date).at(-1);
        const active = m.startDate <= date && (!m.stopDate || date <= m.stopDate) && latest && latest.type !== "stop";
        if (active) {
          const times = allReminders
            .filter((r) => r.medicationId === m.id && reminderOn(r, date) && (!m.stopDate || date <= m.stopDate))
            .flatMap((r) => r.times)
            .sort();
          out.push({
            id: `dose-${m.id}`,
            layer: "meds",
            type: "dose",
            title: `${m.name} ${latest.doseMg} mg`,
            detail: [latest.schedule, times.length ? `Reminder ${times.map(formatTime).join(", ")}` : ""].filter(Boolean).join(" · "),
            time: times[0],
          });
        }
        for (const c of history.filter((c) => c.date === date)) {
          out.push({
            id: c.id,
            layer: "meds",
            type: "event",
            title:
              c.type === "start" ? `Started ${m.name}` : c.type === "stop" ? `Stopped ${m.name}` : `${m.name} changed to ${c.doseMg} mg`,
            detail: c.reason || undefined,
          });
        }
        const due = !m.stopDate ? refillDueDate(m.lastFilledOn, m.daysSupply) : null;
        if (due === date) {
          out.push({ id: `refill-${m.id}`, layer: "meds", type: "event", title: `${m.name} refill due`, detail: m.pharmacy });
        }
      }

      // Therapy & visits: what was logged, plus upcoming weekly appointments.
      const logged = sessions.filter((s) => s.date === date && teamById.has(s.providerId));
      for (const s of logged) {
        const p = teamById.get(s.providerId)!;
        out.push({
          id: s.id,
          layer: "therapy",
          type: "session",
          title: isVisit(p) ? `Visit with ${p.name}` : `${providerTypeLabels[p.type]} with ${p.name}`,
          detail: [s.durationMinutes ? `${s.durationMinutes} min` : "", s.summary ?? ""].filter(Boolean).join(" · "),
        });
      }
      if (date >= today) {
        for (const { p, weekly } of schedules) {
          if (!weekly || !weekly.weekdays.includes(dayOfWeek(date))) continue;
          if (date < p.startDate || (p.endDate && date > p.endDate)) continue;
          if (logged.some((s) => s.providerId === p.id)) continue;
          out.push({
            id: `plan-${p.id}-${date}`,
            layer: "therapy",
            type: "planned",
            title: `${providerTypeLabels[p.type]} with ${p.name}`,
            detail: `Usual time${weekly.time ? ` ${formatTime(weekly.time)}` : ""} · from the care team schedule`,
            time: weekly.time,
          });
        }
      }
      return out.sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99"));
    };
  }, [meds, allChanges, allReminders, team, sessions, today]);

  // The month grid, Sunday first.
  const first = `${month}-01`;
  const gridStart = addDays(first, -dayOfWeek(first));
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const weeks = [0, 1, 2, 3, 4, 5].map((w) => days.slice(w * 7, w * 7 + 7)).filter((w) => w.some((d) => d.startsWith(month)));
  const shown = (d: IsoDate) => itemsOn(d).filter((i) => layers.includes(i.layer));
  const selectedItems = shown(selected);

  const shiftMonth = (n: number) => {
    const d = parseIsoDate(first);
    d.setUTCMonth(d.getUTCMonth() + n);
    setMonth(d.toISOString().slice(0, 7));
  };
  const toggle = (layer: Layer) =>
    setLayers((prev) => (prev.includes(layer) ? prev.filter((l) => l !== layer) : [...prev, layer]));

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-lg" className="rounded-full" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
              <ChevronLeft />
            </Button>
            <h3 className="min-w-36 text-center text-lg font-extrabold" aria-live="polite">
              {formatMonthYear(first)}
            </h3>
            <Button variant="ghost" size="icon-lg" className="rounded-full" aria-label="Next month" onClick={() => shiftMonth(1)}>
              <ChevronRight />
            </Button>
            {month !== today.slice(0, 7) && (
              <Button
                variant="outline"
                size="sm"
                className="ml-1 rounded-full bg-white"
                onClick={() => {
                  setMonth(today.slice(0, 7));
                  setSelected(today);
                }}
              >
                Today
              </Button>
            )}
          </div>
          <div role="group" aria-label="Show on the calendar" className="flex gap-2">
            {(
              [
                ["meds", "Medications"],
                ["therapy", "Therapy & visits"],
              ] as const
            ).map(([layer, label]) => (
              <button
                key={layer}
                type="button"
                aria-pressed={layers.includes(layer)}
                onClick={() => toggle(layer)}
                className="rounded-full bg-cream px-3 py-1.5 text-sm font-bold text-teal/80 transition-colors hover:bg-amber/30 aria-pressed:bg-teal aria-pressed:text-paper"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <table className="w-full table-fixed border-separate border-spacing-1" aria-label={`${childName}'s calendar, ${formatMonthYear(first)}`}>
          <thead>
            <tr>
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <th key={i} scope="col" className="pb-1 text-xs font-bold text-muted-foreground">
                  <abbr title={["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][i]} className="no-underline">
                    {d}
                  </abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week[0]}>
                {week.map((d) => {
                  const inMonth = d.startsWith(month);
                  const items = shown(d);
                  const doses = items.filter((i) => i.type === "dose").length;
                  const events = items.filter((i) => i.type === "event").length;
                  const logged = items.filter((i) => i.type === "session").length;
                  const planned = items.filter((i) => i.type === "planned").length;
                  const labels = items.filter((i) => i.type !== "dose");
                  const isSelected = d === selected;
                  return (
                    <td key={d} className="p-0 align-top">
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        aria-label={`${formatLongWeekday(d)}: ${describeCounts(doses, events, logged, planned)}`}
                        onClick={() => setSelected(d)}
                        className={cn(
                          "flex h-14 w-full flex-col items-center gap-1 rounded-xl bg-white px-0.5 pt-1 text-sm transition-colors hover:bg-cream md:h-24 md:items-stretch md:px-1.5",
                          !inMonth && "opacity-40",
                          isSelected && "bg-teal text-paper hover:bg-teal",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-6 items-center justify-center self-center rounded-full font-bold md:self-start",
                            d === today && !isSelected && "ring-2 ring-teal",
                          )}
                        >
                          {Number(d.slice(8))}
                        </span>
                        <span className="flex flex-wrap justify-center gap-0.5 md:hidden" aria-hidden>
                          {doses > 0 && <Dot className="bg-amber" />}
                          {events > 0 && <Dot className="bg-coral" />}
                          {logged > 0 && <Dot className={isSelected ? "bg-paper" : "bg-teal"} />}
                          {planned > 0 && <Dot className={cn("ring-2 ring-inset", isSelected ? "ring-paper" : "ring-teal")} />}
                        </span>
                        <span className="hidden min-w-0 flex-col gap-0.5 text-left md:flex" aria-hidden>
                          {doses > 0 && (
                            <span className="flex items-center gap-1 px-1 text-[11px] font-semibold opacity-80">
                              <Dot className="bg-amber" /> {doses}
                            </span>
                          )}
                          {labels.slice(0, 2).map((i) => (
                            <span
                              key={i.id}
                              className={cn(
                                "truncate rounded px-1 text-[11px] font-semibold",
                                isSelected ? "bg-paper/20" : i.type === "event" ? "bg-coral/25" : i.type === "planned" ? "ring-1 ring-teal/40 ring-inset" : "bg-teal/10",
                              )}
                            >
                              {i.title}
                            </span>
                          ))}
                          {labels.length > 2 && <span className="px-1 text-[11px] font-semibold opacity-80">+{labels.length - 2} more</span>}
                        </span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {layers.includes("meds") && (
            <>
              <Legend dot="bg-amber" label="Medication scheduled" />
              <Legend dot="bg-coral" label="Dose change or refill" />
            </>
          )}
          {layers.includes("therapy") && (
            <>
              <Legend dot="bg-teal" label="Session or visit logged" />
              <Legend dot="ring-2 ring-inset ring-teal" label="Usual appointment" />
            </>
          )}
        </p>

        <section aria-live="polite" aria-labelledby="day-heading" className="rounded-2xl bg-white p-4">
          <h4 id="day-heading" className="font-extrabold">
            {selected === today ? "Today · " : ""}
            {formatLongWeekday(selected)}
          </h4>
          {layers.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">Pick Medications or Therapy & visits to see the day.</p>
          ) : selectedItems.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">Nothing on the calendar for this day.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {selectedItems.map((i) => (
                <li key={i.id} className="flex items-start gap-3 text-sm">
                  <ItemIcon item={i} />
                  <span className="min-w-0">
                    <span className="block font-bold">
                      {i.time && i.type !== "dose" && <span className="mr-1">{formatTime(i.time)} ·</span>}
                      {i.title}
                      {i.type === "planned" && <span className="ml-1 font-normal text-muted-foreground">(planned)</span>}
                    </span>
                    {i.detail && <span className="block text-muted-foreground">{i.detail}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

function describeCounts(doses: number, events: number, logged: number, planned: number): string {
  const parts = [
    doses && `${doses} medication${doses === 1 ? "" : "s"}`,
    events && `${events} change${events === 1 ? "" : "s"} or refill${events === 1 ? "" : "s"}`,
    logged && `${logged} session${logged === 1 ? "" : "s"} logged`,
    planned && `${planned} usual appointment${planned === 1 ? "" : "s"}`,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "nothing recorded";
}

function Dot({ className }: { className: string }) {
  return <span className={cn("size-2 rounded-full", className)} />;
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2.5 rounded-full", dot)} aria-hidden />
      {label}
    </span>
  );
}

function ItemIcon({ item }: { item: DayItem }) {
  const Icon =
    item.layer === "meds"
      ? item.type === "event"
        ? CalendarClock
        : item.detail?.includes("Reminder")
          ? BellRing
          : Pill
      : item.title.startsWith("Visit")
        ? Stethoscope
        : HeartHandshake;
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full",
        item.type === "dose" && "bg-amber/30",
        item.type === "event" && "bg-coral/25",
        item.type === "session" && "bg-teal/10",
        item.type === "planned" && "ring-1 ring-teal/40",
      )}
      aria-hidden
    >
      <Icon className="size-4" />
    </span>
  );
}
