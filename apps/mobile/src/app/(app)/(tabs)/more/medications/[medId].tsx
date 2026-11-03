import { Stack, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import type { MedicationsResponse } from "@lanternway/shared/api";
import { addDays } from "@lanternway/shared/dates";
import { formatAverage, formatDate } from "@lanternway/shared/format";
import { changeLabel, compareAround, describeComparison, type Comparison } from "@lanternway/shared/insights";
import { describeMedicationChange } from "@lanternway/shared/schedule";
import type { MedicationChange } from "@lanternway/shared/types";
import { Disclaimer, Page, UpdatedNote, s as parts } from "@/components/screen-parts";
import { Body, Card } from "@/components/ui";
import { getMedications } from "@/lib/api";
import { useCurrentChild } from "@/lib/current-child";
import { phoneToday } from "@/lib/logs";
import { historyOf } from "@/lib/medications";
import { useSession } from "@/lib/session";
import { useCachedScreen } from "@/lib/use-cached-screen";
import { colors, fonts } from "@/theme";

/** One medication's dose history, newest first, with what was recorded in the six weeks before and after each change. */
export default function DoseHistory() {
  const { medId } = useLocalSearchParams<{ medId: string }>();
  const { session } = useSession();
  const { current } = useCurrentChild();
  const userId = session.status === "signed-in" ? session.me.user.id : "";
  const { data, savedAt, offline, refreshing, refresh } = useCachedScreen<MedicationsResponse>("medications", userId, current?.child.id ?? null, getMedications);

  const med = data?.medications.find((m) => m.id === medId);
  const today = data?.today ?? phoneToday();
  // The phone has a year of logs and check-ins: older changes are listed without the comparison.
  const comparedFrom = addDays(today, -365 + 42);
  const changes = med ? historyOf(med.id, data!.medicationChanges).reverse() : [];

  return (
    <Page edges={[]} refreshing={refreshing} onRefresh={() => refresh()}>
      <Stack.Screen options={{ title: med?.name ?? "Dose history" }} />
      {!data ? (
        <Card>
          <Body muted>{offline ? "This shows once Lanternway is reachable." : "Loading…"}</Body>
        </Card>
      ) : !med ? (
        <Card>
          <Body muted>We couldn’t find this medication. It may have been removed.</Body>
        </Card>
      ) : (
        <>
          <Body muted center={false}>
            Each change as recorded, and how home and school days looked in the weeks before and after.
          </Body>
          {changes.length === 0 && (
            <Card>
              <Body muted>No dose changes recorded yet.</Body>
            </Card>
          )}
          {changes.map((c) => (
            <ChangeCard
              key={c.id}
              change={c}
              name={med.name}
              comparison={c.date >= comparedFrom ? compareAround(c.date, data.logs, data.checkIns, today) : null}
            />
          ))}
        </>
      )}
      <UpdatedNote savedAt={savedAt} offline={offline} />
      <Disclaimer />
    </Page>
  );
}

function ChangeCard({ change, name, comparison }: { change: MedicationChange; name: string; comparison: Comparison | null }) {
  return (
    <Card>
      <View style={{ gap: 2 }}>
        <Text style={parts.rowMuted}>{formatDate(change.date)}</Text>
        <Text style={st.title} accessibilityRole="header">
          {describeMedicationChange(change, name)}
        </Text>
        {change.schedule ? <Text style={parts.rowMuted}>{change.schedule}</Text> : null}
      </View>
      {change.reason ? (
        <Text style={st.line}>
          <Text style={{ fontFamily: fonts.bold }}>Why: </Text>
          {change.reason}
        </Text>
      ) : null}
      {change.sideEffectsObserved.length > 0 && (
        <Text style={st.line}>
          <Text style={{ fontFamily: fonts.bold }}>Noticed afterward: </Text>
          {change.sideEffectsObserved.join("; ")}
        </Text>
      )}
      {change.notes ? <Text style={parts.rowMuted}>{change.notes}</Text> : null}
      {comparison && <BeforeAfter comparison={comparison} label={changeLabel(change, name)} />}
    </Card>
  );
}

function BeforeAfter({ comparison, label }: { comparison: Comparison; label: string }) {
  const { before, after } = comparison;
  const rows = [
    { label: "Teacher focus", before: before.checkIns.focus, after: after.checkIns.focus, unit: "/ 5" },
    { label: "Sleep", before: before.logs.sleepHours, after: after.logs.sleepHours, unit: "hrs" },
    { label: "Appetite", before: before.logs.appetite, after: after.logs.appetite, unit: "/ 5" },
    { label: "Mood", before: before.logs.mood, after: after.logs.mood, unit: "/ 5" },
    { label: "Meltdowns", before: before.logs.meltdownsPerWeek, after: after.logs.meltdownsPerWeek, unit: "/ week" },
  ];
  return (
    <>
      <View style={parts.inner}>
        <Text style={st.caption}>{comparison.windowDays / 7} weeks before vs. after</Text>
        <View style={st.tr}>
          <Text style={[st.th, { flex: 1.4 }]}>Measure</Text>
          <Text style={[st.th, st.num]}>Before</Text>
          <Text style={[st.th, st.num]}>After</Text>
        </View>
        {rows.map((r) => (
          <View
            key={r.label}
            style={[st.tr, st.rowLine]}
            accessible
            accessibilityLabel={`${r.label}: before ${formatAverage(r.before)} ${r.unit}, after ${formatAverage(r.after)} ${r.unit}`}
          >
            <Text style={[st.td, { flex: 1.4, fontFamily: fonts.semibold }]}>{r.label}</Text>
            <Text style={[st.td, st.num]}>
              {formatAverage(r.before)} <Text style={st.unit}>{r.unit}</Text>
            </Text>
            <Text style={[st.td, st.num, { fontFamily: fonts.bold }]}>
              {formatAverage(r.after)} <Text style={st.unit}>{r.unit}</Text>
            </Text>
          </View>
        ))}
      </View>
      <Text style={parts.rowMuted}>{describeComparison(comparison, label)}</Text>
    </>
  );
}

const st = StyleSheet.create({
  title: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.teal },
  line: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.teal },
  caption: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  tr: { flexDirection: "row", gap: 6, paddingVertical: 5 },
  rowLine: { borderTopWidth: 1, borderTopColor: colors.border },
  th: { flex: 1, fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  td: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.teal, fontVariant: ["tabular-nums"] },
  num: { textAlign: "right" },
  unit: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
});
