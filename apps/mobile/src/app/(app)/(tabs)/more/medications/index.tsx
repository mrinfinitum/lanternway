import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { MedicationsResponse } from "@lanternway/shared/api";
import { addDays } from "@lanternway/shared/dates";
import { formatAverage, formatAxisMonth, formatDate, formatRelativeDays } from "@lanternway/shared/format";
import { refillDueDate, rollingAverage, weeklySeries } from "@lanternway/shared/insights";
import { refillReminderDate, refillReminderDays } from "@lanternway/shared/refills";
import { reminderSummary } from "@lanternway/shared/schedule";
import type { IsoDate, Medication } from "@lanternway/shared/types";
import { CareCalendar } from "@/components/care-calendar";
import { RefillSheet } from "@/components/refill-sheet";
import { ChildHeader, Disclaimer, Page, Section, UpdatedNote, s as parts } from "@/components/screen-parts";
import { Body, Button, Card } from "@/components/ui";
import { getMedications } from "@/lib/api";
import { useCurrentChild } from "@/lib/current-child";
import { latestChange, prescriberContact, prescriberName } from "@/lib/medications";
import { phoneToday } from "@/lib/logs";
import { useSession } from "@/lib/session";
import { useCachedScreen } from "@/lib/use-cached-screen";
import { colors, fonts, radius } from "@/theme";

/** Medications: what's prescribed, refills, reminders (settings only), the calendar, and each medication's dose history. Read-only on the phone for now. */
export default function Medications() {
  const { session, refreshMe } = useSession();
  const { current } = useCurrentChild();
  const userId = session.status === "signed-in" ? session.me.user.id : "";
  const childId = current?.child.id ?? null;
  const { data, savedAt, offline, refreshing, refresh } = useCachedScreen<MedicationsResponse>("medications", userId, childId, getMedications);
  const [refillFor, setRefillFor] = useState<Medication | null>(null);

  if (session.status !== "signed-in" || !current) return null;
  const childName = current.child.firstName;
  const today = data?.today ?? phoneToday();
  const meds = data?.medications ?? [];
  const currentMeds = meds.filter((m) => !m.stopDate);
  const past = meds.filter((m) => m.stopDate);

  return (
    <Page edges={[]} refreshing={refreshing} onRefresh={() => refresh(refreshMe)}>
      <ChildHeader title="Medications" />
      <Body muted center={false}>What’s been prescribed, when it changed, and how days looked around each change.</Body>

      {!data ? (
        <Card>
          <Body muted>{offline ? "Medications show once Lanternway is reachable." : "Loading…"}</Body>
        </Card>
      ) : (
        <>
          <Section>Current medications</Section>
          {currentMeds.length === 0 ? (
            <Card>
              <Text style={parts.cardTitle}>No current medications for {childName}.</Text>
              <Text style={parts.rowMuted}>When one is added on the Lanternway website, you’ll see the dose, prescriber, and refills here.</Text>
            </Card>
          ) : (
            currentMeds.map((med) => (
              <MedicationCard key={med.id} med={med} data={data} today={today} onRefill={() => setRefillFor(med)} />
            ))
          )}

          {past.length > 0 && (
            <>
              <Section>Past medications</Section>
              <Card>
                {past.map((m) => (
                  <View key={m.id} style={{ gap: 2 }}>
                    <Text style={parts.rowTitle}>{m.name}</Text>
                    <Text style={parts.rowMuted}>
                      {formatDate(m.startDate)} – {formatDate(m.stopDate!)}
                      {prescriberName(m, data.providers) ? ` · ${prescriberName(m, data.providers)}` : ""}
                    </Text>
                    <Button label="Dose history" kind="secondary" onPress={() => router.push({ pathname: "/more/medications/[medId]", params: { medId: m.id } })} />
                  </View>
                ))}
              </Card>
            </>
          )}

          <Section>Calendar</Section>
          <CareCalendar
            childName={childName}
            today={today}
            medications={meds}
            changes={data.medicationChanges}
            reminders={data.reminders}
            providers={data.providers}
            sessions={data.sessions}
            initialLayers={["meds"]}
          />

          {meds.length > 0 && <YearNumbers data={data} today={today} />}
        </>
      )}

      <UpdatedNote savedAt={savedAt} offline={offline} />
      <Disclaimer />

      {refillFor && (
        <RefillSheet
          med={refillFor}
          childName={childName}
          senderName={session.me.user.name}
          role={current.role}
          prescriber={prescriberContact(refillFor, data?.providers ?? [])}
          onClose={() => setRefillFor(null)}
        />
      )}
    </Page>
  );
}

function MedicationCard({ med, data, today, onRefill }: { med: Medication; data: MedicationsResponse; today: IsoDate; onRefill: () => void }) {
  const latest = latestChange(med.id, data.medicationChanges);
  const due = refillDueDate(med.lastFilledOn, med.daysSupply);
  const reminder = data.reminders.find((r) => r.medicationId === med.id);
  return (
    <Card>
      <View style={{ gap: 2 }}>
        <Text style={st.medName} accessibilityRole="header">
          {med.name}
        </Text>
        <Text style={parts.rowMuted}>{latest ? `${latest.doseMg} mg · ${latest.schedule}` : "No dose recorded"}</Text>
      </View>
      <View style={st.details}>
        <Detail label="For" value={med.purpose} />
        <Detail label="Prescriber" value={prescriberName(med, data.providers)} />
        <Detail label="Started" value={formatDate(med.startDate)} />
        <Detail label="How" value={med.form} />
      </View>
      {due && <RefillLine med={med} due={due} today={today} />}
      {reminder && (
        <View style={parts.inner}>
          <Text style={parts.rowTitle}>Reminder: {reminderSummary(reminder)}</Text>
          <Text style={parts.rowMuted}>Saved · not sending yet</Text>
        </View>
      )}
      <Button label="Ask for a refill" onPress={onRefill} />
      <Button label="Dose history" kind="secondary" onPress={() => router.push({ pathname: "/more/medications/[medId]", params: { medId: med.id } })} />
    </Card>
  );
}

/** "Refill due …", with the reminder setting under it (the website's refill line). */
function RefillLine({ med, due, today }: { med: Medication; due: IsoDate; today: IsoDate }) {
  const remindOn = refillReminderDate(due, med.refillReminderDays);
  const days = refillReminderDays(med.refillReminderDays);
  return (
    <View style={parts.inner}>
      <Text style={parts.rowTitle}>
        Refill due {formatDate(due)} <Text style={{ fontFamily: fonts.regular }}>({formatRelativeDays(due, today)})</Text>
        {med.pharmacy ? <Text style={{ fontFamily: fonts.regular }}> · {med.pharmacy}</Text> : null}
      </Text>
      {remindOn ? (
        <Text style={parts.rowMuted}>
          Refill reminder {days} days before{remindOn >= today ? ` (${formatDate(remindOn)})` : ""} · not sending yet
        </Text>
      ) : (
        <Text style={parts.rowMuted}>Refill reminder off</Text>
      )}
    </View>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <View style={st.detail}>
      <Text style={parts.rowMuted}>{label}</Text>
      <Text style={parts.rowTitle}>{value || "—"}</Text>
    </View>
  );
}

/**
 * The last year by month, for the first current medication: average dose, teacher
 * focus and sleep. The website draws these as charts; the phone shows the numbers
 * until a chart library is chosen.
 */
function YearNumbers({ data, today }: { data: MedicationsResponse; today: IsoDate }) {
  const main = data.medications.find((m) => !m.stopDate) ?? data.medications[0];
  const from = addDays(today, -364);
  const mainChanges = data.medicationChanges.filter((c) => c.medicationId === main.id).sort((a, b) => a.date.localeCompare(b.date));
  const doseOn = (date: string) => mainChanges.filter((c) => c.date <= date).at(-1)?.doseMg ?? null;
  const weekly = weeklySeries(data.logs, data.checkIns, from, today);
  const focus4 = rollingAverage(weekly.map((p) => p.focus), 4);
  const months = new Map<string, { dose: (number | null)[]; focus: (number | null)[]; sleep: (number | null)[] }>();
  weekly.forEach((p, i) => {
    const key = p.week.slice(0, 7);
    const m = months.get(key) ?? { dose: [], focus: [], sleep: [] };
    m.dose.push(doseOn(addDays(p.week, 6)));
    m.focus.push(focus4[i]);
    m.sleep.push(p.sleepHours);
    months.set(key, m);
  });
  const avg = (values: (number | null)[]) => {
    const nums = values.filter((v): v is number => typeof v === "number");
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
  };

  return (
    <>
      <Section>The last year</Section>
      <Card>
        {/* Placeholder until a chart library is approved (MOBILE_PLAN.md M6). */}
        <View style={st.chartPlaceholder} accessible accessibilityLabel="Charts are coming to the phone app. The numbers are below.">
          <Text style={parts.rowTitle}>Charts are coming to the phone app</Text>
          <Text style={parts.rowMuted}>Until then, here are the same numbers by month. Dose is {main.name}.</Text>
        </View>
        <View style={parts.inner}>
          <View style={st.tr}>
            <Text style={[st.th, { flex: 1.4 }]}>Month</Text>
            <Text style={st.th}>Dose (mg)</Text>
            <Text style={st.th}>Teacher focus</Text>
            <Text style={st.th}>Sleep (hrs)</Text>
          </View>
          {[...months.entries()].map(([month, m]) => (
            <View key={month} style={[st.tr, st.rowLine]} accessible>
              <Text style={[st.td, { flex: 1.4, fontFamily: fonts.semibold }]}>{formatAxisMonth(`${month}-01`)}</Text>
              <Text style={st.td}>{formatAverage(avg(m.dose), 0)}</Text>
              <Text style={st.td}>{formatAverage(avg(m.focus))}</Text>
              <Text style={st.td}>{formatAverage(avg(m.sleep))}</Text>
            </View>
          ))}
        </View>
        <Text style={parts.rowMuted}>Teacher ratings come from weekly check-ins, so there are gaps over school breaks.</Text>
      </Card>
    </>
  );
}

const st = StyleSheet.create({
  medName: { fontFamily: fonts.extrabold, fontSize: 20, color: colors.teal },
  details: { flexDirection: "row", flexWrap: "wrap", rowGap: 10 },
  detail: { width: "50%", paddingRight: 8 },
  chartPlaceholder: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: radius.button,
    padding: 16,
    gap: 4,
    alignItems: "center",
  },
  tr: { flexDirection: "row", gap: 6, paddingVertical: 4 },
  rowLine: { borderTopWidth: 1, borderTopColor: colors.border },
  th: { flex: 1, fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  td: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.teal, fontVariant: ["tabular-nums"] },
});
