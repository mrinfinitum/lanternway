/**
 * A month calendar of medications and therapy (the website's care calendar, built
 * from the same shared code in @lanternway/shared/schedule). Tap a day to see it.
 */
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatLongWeekday, formatMonthYear, formatTime } from "@lanternway/shared/format";
import {
  calendarItems,
  describeCalendarCounts,
  monthWeeks,
  shiftMonth,
  type CalendarItem,
  type CalendarLayer,
  type CalendarSession,
} from "@lanternway/shared/schedule";
import type { IsoDate, Medication, MedicationChange, MedicationReminder, Provider } from "@lanternway/shared/types";
import { s as parts } from "@/components/screen-parts";
import { Card } from "@/components/ui";
import { colors, fonts, minTap, radius } from "@/theme";

const layerOptions: [CalendarLayer, string][] = [
  ["meds", "Medications"],
  ["therapy", "Therapy & visits"],
];

const dotColor: Record<CalendarItem["type"], string> = {
  dose: colors.amber,
  event: colors.coral,
  session: colors.teal,
  planned: "transparent",
};

export function CareCalendar({ childName, today, medications, changes, reminders, providers, sessions, initialLayers }: {
  childName: string;
  today: IsoDate;
  medications: Medication[];
  changes: MedicationChange[];
  reminders: MedicationReminder[];
  providers: Provider[];
  sessions: CalendarSession[];
  initialLayers: CalendarLayer[];
}) {
  const [layers, setLayers] = useState(initialLayers);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState<IsoDate>(today);
  const itemsOn = useMemo(
    () => calendarItems({ today, medications, changes, reminders, providers, sessions }),
    [today, medications, changes, reminders, providers, sessions],
  );
  const shown = (d: IsoDate) => itemsOn(d).filter((i) => layers.includes(i.layer));
  const selectedItems = shown(selected);
  const toggle = (layer: CalendarLayer) => setLayers((prev) => (prev.includes(layer) ? prev.filter((l) => l !== layer) : [...prev, layer]));

  return (
    <Card>
      <View style={st.monthRow}>
        <Pressable onPress={() => setMonth(shiftMonth(month, -1))} accessibilityRole="button" accessibilityLabel="Previous month" style={st.arrow}>
          <Text style={st.arrowText}>‹</Text>
        </Pressable>
        <Text style={st.month} accessibilityRole="header" accessibilityLiveRegion="polite">
          {formatMonthYear(`${month}-01`)}
        </Text>
        <Pressable onPress={() => setMonth(shiftMonth(month, 1))} accessibilityRole="button" accessibilityLabel="Next month" style={st.arrow}>
          <Text style={st.arrowText}>›</Text>
        </Pressable>
      </View>
      {month !== today.slice(0, 7) && (
        <Pressable
          onPress={() => {
            setMonth(today.slice(0, 7));
            setSelected(today);
          }}
          accessibilityRole="button"
          style={[st.chip, { alignSelf: "center" }]}
        >
          <Text style={st.chipText}>Back to today</Text>
        </Pressable>
      )}

      <View style={st.chips} accessibilityLabel="Show on the calendar">
        {layerOptions.map(([layer, label]) => {
          const on = layers.includes(layer);
          return (
            <Pressable
              key={layer}
              onPress={() => toggle(layer)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              style={[st.chip, on && { backgroundColor: colors.teal }]}
            >
              <Text style={[st.chipText, on && { color: colors.white }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View accessibilityLabel={`${childName}’s calendar, ${formatMonthYear(`${month}-01`)}`}>
        <View style={st.week}>
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <Text key={i} style={st.weekday} importantForAccessibility="no">
              {d}
            </Text>
          ))}
        </View>
        {monthWeeks(month).map((week) => (
          <View key={week[0]} style={st.week}>
            {week.map((d) => {
              const items = shown(d);
              const types = [...new Set(items.map((i) => i.type))];
              const isSelected = d === selected;
              return (
                <Pressable
                  key={d}
                  onPress={() => setSelected(d)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${formatLongWeekday(d)}: ${describeCalendarCounts(items)}`}
                  style={[st.day, !d.startsWith(month) && { opacity: 0.4 }, isSelected && { backgroundColor: colors.teal }]}
                >
                  <Text style={[st.dayNumber, d === today && !isSelected && st.todayRing, isSelected && { color: colors.white }]}>{Number(d.slice(8))}</Text>
                  <View style={st.dots}>
                    {types.map((t) => (
                      <View
                        key={t}
                        style={[
                          st.dot,
                          { backgroundColor: t === "session" && isSelected ? colors.paper : dotColor[t] },
                          t === "planned" && { borderWidth: 2, borderColor: isSelected ? colors.paper : colors.teal },
                        ]}
                      />
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <View style={st.legend}>
        {layers.includes("meds") && (
          <>
            <Key color={colors.amber} label="Medication scheduled" />
            <Key color={colors.coral} label="Dose change or refill" />
          </>
        )}
        {layers.includes("therapy") && (
          <>
            <Key color={colors.teal} label="Session or visit logged" />
            <Key ring label="Usual appointment" />
          </>
        )}
      </View>

      <View style={parts.inner} accessibilityLiveRegion="polite">
        <Text style={parts.cardTitle}>
          {selected === today ? "Today · " : ""}
          {formatLongWeekday(selected)}
        </Text>
        {layers.length === 0 ? (
          <Text style={parts.rowMuted}>Pick Medications or Therapy & visits to see the day.</Text>
        ) : selectedItems.length === 0 ? (
          <Text style={parts.rowMuted}>Nothing on the calendar for this day.</Text>
        ) : (
          selectedItems.map((i) => (
            <View key={i.id} style={st.item}>
              <View style={[st.dot, { marginTop: 7, backgroundColor: dotColor[i.type] }, i.type === "planned" && { borderWidth: 2, borderColor: colors.teal }]} />
              <View style={{ flex: 1 }}>
                <Text style={parts.rowTitle}>
                  {i.time && i.type !== "dose" ? `${formatTime(i.time)} · ` : ""}
                  {i.title}
                  {i.type === "planned" ? <Text style={{ fontFamily: fonts.regular, color: colors.muted }}> (planned)</Text> : null}
                </Text>
                {i.detail ? <Text style={parts.rowMuted}>{i.detail}</Text> : null}
              </View>
            </View>
          ))
        )}
      </View>
    </Card>
  );
}

function Key({ color, ring, label }: { color?: string; ring?: boolean; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={[st.dot, { backgroundColor: color ?? "transparent" }, ring && { borderWidth: 2, borderColor: colors.teal }]} />
      <Text style={st.keyText}>{label}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  arrow: { width: minTap, height: minTap, borderRadius: minTap / 2, alignItems: "center", justifyContent: "center" },
  arrowText: { fontFamily: fonts.bold, fontSize: 28, color: colors.teal },
  month: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.teal },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: minTap - 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.cream, justifyContent: "center" },
  chipText: { fontFamily: fonts.bold, fontSize: 14, color: colors.teal },
  week: { flexDirection: "row", gap: 4, marginBottom: 4 },
  weekday: { flex: 1, textAlign: "center", fontFamily: fonts.bold, fontSize: 12, color: colors.muted },
  day: { flex: 1, height: 52, borderRadius: radius.button, backgroundColor: colors.white, alignItems: "center", paddingTop: 4, gap: 4 },
  dayNumber: { fontFamily: fonts.bold, fontSize: 15, color: colors.teal, width: 26, height: 26, lineHeight: 24, textAlign: "center", borderRadius: 13 },
  todayRing: { borderWidth: 2, borderColor: colors.teal },
  dots: { flexDirection: "row", gap: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legend: { flexDirection: "row", flexWrap: "wrap", columnGap: 14, rowGap: 6 },
  keyText: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  item: { flexDirection: "row", gap: 10 },
});
