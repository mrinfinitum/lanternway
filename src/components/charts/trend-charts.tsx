"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { brandColors } from "@/lib/brand";
import { formatAxisMonth, formatDate } from "@/lib/format";
import type { IsoDate } from "@/lib/types";

// Small multiples on one shared timeline: each measure gets its own chart
// and its own y-axis (never two scales on one plot). Hovering one chart
// shows the same week on all of them (syncId).

export type TrendPoint = {
  week: IsoDate;
  dose?: number | null;
  focus?: number | null;
  sleepHours?: number | null;
  mood?: number | null;
};

export type TrendEvent = { week: IsoDate; n: number; label: string };

export type PanelKey = "dose" | "focus" | "sleepHours" | "mood";

const panelConfig: Record<
  PanelKey,
  {
    title: string;
    unit: string;
    note: string;
    domain: [number, number];
    ticks?: number[];
    step?: boolean;
    digits: number;
  }
> = {
  dose: { title: "Dose", unit: "mg", note: "mg per day", domain: [0, 40], ticks: [0, 10, 20, 30, 40], step: true, digits: 0 },
  focus: { title: "Teacher focus rating", unit: "/ 5", note: "4-week average, 1–5", domain: [1, 5], ticks: [1, 2, 3, 4, 5], digits: 1 },
  sleepHours: { title: "Sleep", unit: "hrs", note: "weekly average, hours", domain: [7.5, 10.5], ticks: [8, 9, 10], digits: 1 },
  mood: { title: "Mood", unit: "/ 5", note: "weekly average, 1–5", domain: [1, 5], ticks: [1, 2, 3, 4, 5], digits: 1 },
};

const INK_MUTED = "#42636b";
const GRID = "#e9d3b4";
const Y_AXIS_WIDTH = 32;

export function TrendCharts({
  data,
  events,
  panels,
  titles = {},
  syncId = "trends",
}: {
  data: TrendPoint[];
  events: TrendEvent[];
  panels: PanelKey[];
  titles?: Partial<Record<PanelKey, string>>;
  syncId?: string;
}) {
  // A tick at the start of each quarter keeps the axis readable on a phone.
  const ticks = data
    .map((d) => d.week)
    .filter((w, i, all) => {
      const month = Number(w.slice(5, 7));
      const prev = all[i - 1];
      return [1, 4, 7, 10].includes(month) && (!prev || prev.slice(5, 7) !== w.slice(5, 7));
    });

  return (
    <div className="space-y-4">
      {panels.map((key, i) => {
        const cfg = panelConfig[key];
        const last = i === panels.length - 1;
        return (
          <figure key={key}>
            <figcaption className="mb-1 flex items-baseline justify-between gap-2">
              <span className="font-bold">{titles[key] ?? cfg.title}</span>
              <span className="text-xs text-muted-foreground">{cfg.note}</span>
            </figcaption>
            <div className={last ? "h-44" : "h-32"}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} syncId={syncId} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke={GRID} strokeWidth={1} />
                  <XAxis
                    dataKey="week"
                    ticks={ticks}
                    tickFormatter={formatAxisMonth}
                    tick={{ fill: INK_MUTED, fontSize: 11 }}
                    axisLine={{ stroke: GRID }}
                    tickLine={false}
                    hide={!last}
                    height={last ? 24 : 0}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={cfg.domain}
                    ticks={cfg.ticks}
                    width={Y_AXIS_WIDTH}
                    tick={{ fill: INK_MUTED, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDataOverflow
                  />
                  {events.map((e) => (
                    <ReferenceLine
                      key={`${key}-${e.n}`}
                      x={e.week}
                      stroke={brandColors.coral}
                      strokeWidth={1}
                      label={
                        i === 0
                          ? { value: String(e.n), position: "top", fill: brandColors.teal, fontSize: 11, fontWeight: 800 }
                          : undefined
                      }
                    />
                  ))}
                  {cfg.step && (
                    <Area
                      type="stepAfter"
                      dataKey={key}
                      stroke="none"
                      fill={brandColors.teal}
                      fillOpacity={0.1}
                      isAnimationActive={false}
                      activeDot={false}
                      tooltipType="none"
                    />
                  )}
                  <Line
                    type={cfg.step ? "stepAfter" : "monotone"}
                    dataKey={key}
                    name={titles[key] ?? cfg.title}
                    stroke={brandColors.teal}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    dot={false}
                    activeDot={{ r: 4, fill: brandColors.teal, stroke: brandColors.cream, strokeWidth: 2 }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                  <Tooltip
                    cursor={{ stroke: INK_MUTED, strokeWidth: 1 }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const value = payload.find((p) => p.dataKey === key)?.value;
                      const event = events.find((e) => e.week === label);
                      return (
                        <div className="rounded-xl border bg-white px-3 py-2 text-xs shadow-sm">
                          <p className="font-semibold text-muted-foreground">Week of {formatDate(String(label))}</p>
                          <p className="text-sm font-bold text-teal">
                            {typeof value === "number" ? `${value.toFixed(cfg.digits)} ${cfg.unit}` : "No entries"}
                          </p>
                          {event && (
                            <p className="mt-1 text-teal">
                              <span className="font-bold">{event.n}.</span> {event.label}
                            </p>
                          )}
                        </div>
                      );
                    }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </figure>
        );
      })}
    </div>
  );
}
