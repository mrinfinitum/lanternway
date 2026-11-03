/**
 * The medication trend charts (the website's TrendCharts, drawn with react-native-svg):
 * small charts on one shared timeline, each measure with its own y-axis, and a
 * numbered coral line at each medication change. Nothing animates. Each chart has
 * a plain-text summary for screen readers.
 */
import { useState } from "react";
import { Text, View } from "react-native";
import Svg, { Line, Path, Text as SvgText } from "react-native-svg";
import { formatAverage, formatAxisMonth, formatShortDate } from "@lanternway/shared/format";
import type { IsoDate } from "@lanternway/shared/types";
import { s as parts } from "@/components/screen-parts";
import { colors, fonts } from "@/theme";

export type TrendPoint = { week: IsoDate; dose: number | null; focus: number | null; sleepHours: number | null };
export type TrendEvent = { week: IsoDate; n: number; label: string };
export type PanelKey = "dose" | "focus" | "sleepHours";

// The website's panels (apps/web/src/components/charts/trend-charts.tsx).
const panelConfig: Record<PanelKey, { title: string; unit: string; note: string; domain: [number, number]; ticks: number[]; step?: boolean; digits: number }> = {
  dose: { title: "Dose", unit: "mg", note: "mg per day", domain: [0, 40], ticks: [0, 10, 20, 30, 40], step: true, digits: 0 },
  focus: { title: "Teacher focus rating", unit: "/ 5", note: "4-week average, 1–5", domain: [1, 5], ticks: [1, 2, 3, 4, 5], digits: 1 },
  sleepHours: { title: "Sleep", unit: "hrs", note: "weekly average, hours", domain: [7.5, 10.5], ticks: [8, 9, 10], digits: 1 },
};

const Y_AXIS = 30;
const TOP = 16;
const AXIS_H = 20;
/** Room under a chart without an x-axis, so its lowest y label isn't cut off. */
const BOTTOM = 8;

export function TrendCharts({ data, events, panels, titles = {} }: {
  data: TrendPoint[];
  events: TrendEvent[];
  panels: PanelKey[];
  titles?: Partial<Record<PanelKey, string>>;
}) {
  const [width, setWidth] = useState(0);

  return (
    <View style={{ gap: 14 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 &&
        panels.map((key, i) => (
          <Panel
            key={key}
            panel={key}
            title={titles[key] ?? panelConfig[key].title}
            data={data}
            events={events}
            width={width}
            numbered={i === 0}
            axis={i === panels.length - 1}
          />
        ))}
    </View>
  );
}

function Panel({ panel, title, data, events, width, numbered, axis }: {
  panel: PanelKey;
  title: string;
  data: TrendPoint[];
  events: TrendEvent[];
  width: number;
  numbered: boolean;
  axis: boolean;
}) {
  const cfg = panelConfig[panel];
  const plotH = axis ? 116 : 88;
  const height = TOP + plotH + (axis ? AXIS_H : BOTTOM);
  const plotW = width - Y_AXIS - 6;
  const [lo, hi] = [Math.min(cfg.domain[0], ...cfg.ticks), Math.max(cfg.domain[1], ...values(data, panel))];
  const x = (i: number) => Y_AXIS + (data.length <= 1 ? 0 : (i / (data.length - 1)) * plotW);
  const y = (v: number) => TOP + plotH - ((Math.min(Math.max(v, lo), hi) - lo) / (hi - lo)) * plotH;
  const indexOf = (week: IsoDate) => data.findIndex((d) => d.week === week);

  // The line, broken where a week has no entries (as on the website).
  let line = "";
  let area = "";
  let open = false;
  data.forEach((d, i) => {
    const v = d[panel];
    if (v == null) {
      if (open && cfg.step) area += ` V${TOP + plotH} Z`;
      open = false;
      return;
    }
    if (!open) {
      line += ` M${x(i)},${y(v)}`;
      if (cfg.step) area += ` M${x(i)},${TOP + plotH} L${x(i)},${y(v)}`;
    } else if (cfg.step) {
      line += ` H${x(i)} V${y(v)}`;
      area += ` H${x(i)} V${y(v)}`;
    } else {
      line += ` L${x(i)},${y(v)}`;
    }
    open = true;
  });
  if (open && cfg.step) area += ` H${x(data.length - 1)} V${TOP + plotH} Z`;

  // A tick at the start of each quarter, as on the website.
  const quarterTicks = data
    .map((d, i) => ({ week: d.week, i }))
    .filter(({ week }, j, all) => [1, 4, 7, 10].includes(Number(week.slice(5, 7))) && (j === 0 || all[j - 1].week.slice(5, 7) !== week.slice(5, 7)));

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={describePanel(title, cfg, data, panel, events)}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
        <Text style={[parts.rowTitle, { fontFamily: fonts.bold, flexShrink: 1 }]}>{title}</Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{cfg.note}</Text>
      </View>
      <Svg width={width} height={height}>
        {cfg.ticks.map((t) => (
          <Line key={t} x1={Y_AXIS} x2={width} y1={y(t)} y2={y(t)} stroke={colors.border} strokeWidth={1} />
        ))}
        {cfg.ticks.map((t) => (
          <SvgText key={`l${t}`} x={Y_AXIS - 6} y={y(t) + 4} fontSize={11} fill={colors.muted} textAnchor="end" fontFamily={fonts.regular}>
            {String(t)}
          </SvgText>
        ))}
        {events.map((e) => {
          const i = indexOf(e.week);
          if (i < 0) return null;
          return (
            <Line key={`e${e.n}`} x1={x(i)} x2={x(i)} y1={TOP} y2={TOP + plotH} stroke={colors.coral} strokeWidth={1} />
          );
        })}
        {numbered &&
          events.map((e) => {
            const i = indexOf(e.week);
            if (i < 0) return null;
            return (
              <SvgText key={`n${e.n}`} x={x(i)} y={TOP - 4} fontSize={11} fontWeight="800" fill={colors.teal} textAnchor="middle" fontFamily={fonts.extrabold}>
                {String(e.n)}
              </SvgText>
            );
          })}
        {cfg.step && area ? <Path d={area} fill={colors.teal} fillOpacity={0.1} /> : null}
        {line ? <Path d={line} stroke={colors.teal} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" /> : null}
        {axis && (
          <>
            <Line x1={Y_AXIS} x2={width} y1={TOP + plotH} y2={TOP + plotH} stroke={colors.border} strokeWidth={1} />
            {quarterTicks.map(({ week, i }) => (
              <SvgText key={week} x={x(i)} y={TOP + plotH + 15} fontSize={11} fill={colors.muted} textAnchor="middle" fontFamily={fonts.regular}>
                {formatAxisMonth(week)}
              </SvgText>
            ))}
          </>
        )}
      </Svg>
    </View>
  );
}

const values = (data: TrendPoint[], panel: PanelKey) => data.map((d) => d[panel]).filter((v): v is number => v != null);

/** What a screen reader says for one chart: the range, the first and latest values, and the changes marked. */
function describePanel(title: string, cfg: (typeof panelConfig)[PanelKey], data: TrendPoint[], panel: PanelKey, events: TrendEvent[]): string {
  const known = data.filter((d) => d[panel] != null);
  const range = data.length ? `Weeks of ${formatShortDate(data[0].week)} to ${formatShortDate(data[data.length - 1].week)}.` : "";
  const marks = events.length ? ` Lines mark medication changes ${events.map((e) => e.n).join(", ")}.` : "";
  if (known.length === 0) return `${title}, ${cfg.note}. ${range} Nothing recorded in this period.${marks}`;
  const fmt = (v: number) => `${formatAverage(v, cfg.digits)} ${cfg.unit}`;
  const first = known[0];
  const latest = known[known.length - 1];
  const nums = known.map((d) => d[panel] as number);
  const gaps = data.length - known.length;
  return [
    `${title}, ${cfg.note}. ${range}`,
    `${fmt(first[panel] as number)} in the week of ${formatShortDate(first.week)}; ${fmt(latest[panel] as number)} in the week of ${formatShortDate(latest.week)}.`,
    `Lowest ${fmt(Math.min(...nums))}, highest ${fmt(Math.max(...nums))}.`,
    // Weeks before a medication started aren't missing entries, so gaps are only counted for the logged measures.
    gaps && panel !== "dose" ? `${gaps} week${gaps === 1 ? "" : "s"} with no entries.` : "",
  ]
    .filter(Boolean)
    .join(" ") + marks;
}
