import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { CheckInsResponse, SchoolResponse } from "@lanternway/shared/api";
import { formatDate, formatRelativeDays, formatShortDate } from "@lanternway/shared/format";
import { deliveryStatusLabels, schoolMessageTypeLabels } from "@lanternway/shared/labels";
import type { Accommodation, DeliveryStatus, IepGoal, IepPlan } from "@lanternway/shared/types";
import { CheckIns } from "@/components/check-in-links";
import { Badge, ChildHeader, Page, Section, Segmented, UpdatedNote, s as parts } from "@/components/screen-parts";
import { Body, Card } from "@/components/ui";
import { getCheckIns, getSchool } from "@/lib/api";
import { useCurrentChild } from "@/lib/current-child";
import { phoneToday } from "@/lib/logs";
import { useSession } from "@/lib/session";
import { useCachedScreen } from "@/lib/use-cached-screen";
import { colors, fonts, radius } from "@/theme";

type Tab = "goals" | "supports" | "check-ins" | "messages";
const tabs: { value: Tab; label: string }[] = [
  { value: "goals", label: "Goals" },
  { value: "supports", label: "Supports" },
  { value: "check-ins", label: "Check-ins" },
  { value: "messages", label: "Messages" },
];

/**
 * School: the IEP or 504 plan (dates, team), goal progress, services and
 * accommodations, teacher check-ins with their links, and messages with school.
 * Plan records are changed on the website for now; admins make check-in links here.
 */
export default function School() {
  const { session, refreshMe } = useSession();
  const { current } = useCurrentChild();
  const userId = session.status === "signed-in" ? session.me.user.id : "";
  const childId = current?.child.id ?? null;
  const school = useCachedScreen<SchoolResponse>("school", userId, childId, getSchool);
  const checkIns = useCachedScreen<CheckInsResponse>("check-ins", userId, childId, getCheckIns);
  const [tab, setTab] = useState<Tab>("goals");

  if (!current) return null;
  const childName = current.child.firstName;
  const today = phoneToday();
  const plan = school.data?.iepPlan ?? null;
  const offline = school.offline || checkIns.offline;
  const savedAt = [school.savedAt, checkIns.savedAt].filter((s): s is string => !!s).sort()[0] ?? null;
  const status = current.child.school?.planStatus;

  return (
    <Page edges={[]} refreshing={school.refreshing || checkIns.refreshing} onRefresh={() => void Promise.all([school.refresh(refreshMe), checkIns.refresh()])}>
      <ChildHeader title="School" />
      {!school.data ? (
        <Card>
          <Body muted>{offline ? "School shows once Lanternway is reachable." : "Loading…"}</Body>
        </Card>
      ) : (
        <>
          {plan ? (
            <PlanCard plan={plan} today={today} />
          ) : (
            <Card>
              <Text style={parts.cardTitle}>
                {status === "evaluating"
                  ? `${childName} is being evaluated for a plan.`
                  : status === "none"
                    ? `${childName} doesn’t have an IEP or 504 plan.`
                    : `No IEP or 504 plan for ${childName} yet.`}
              </Text>
              <Text style={parts.rowMuted}>When a plan is added on the Lanternway website, you’ll see goal progress, services, and accommodations here.</Text>
            </Card>
          )}

          <Segmented label="School sections" options={tabs} value={tab} onChange={setTab} />

          {tab === "goals" &&
            (school.data.goals.length === 0 ? (
              <Body muted center={false}>No goals yet.</Body>
            ) : (
              <>
                <Text style={parts.rowMuted}>Progress from the school’s progress reports. The line shows each goal’s target.</Text>
                {school.data.goals.map((g) => (
                  <GoalCard key={g.id} goal={g} />
                ))}
              </>
            ))}

          {tab === "supports" && <Supports supports={school.data.accommodations} />}

          {tab === "check-ins" &&
            (checkIns.data ? (
              <CheckIns
                data={checkIns.data}
                childId={current.child.id}
                childName={childName}
                today={today}
                isAdmin={current.role === "admin"}
                onChanged={() => void checkIns.reload()}
              />
            ) : (
              <Body muted>{offline ? "Check-ins show once Lanternway is reachable." : "Loading…"}</Body>
            ))}

          {tab === "messages" &&
            (school.data.messages.length === 0 ? (
              <Body muted center={false}>No messages recorded yet.</Body>
            ) : (
              [...school.data.messages]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((m) => (
                  <Card key={m.id}>
                    <View style={st.row}>
                      <Badge text={schoolMessageTypeLabels[m.type]} />
                      <Text style={parts.rowMuted}>{formatDate(m.date)}</Text>
                    </View>
                    {m.person ? (
                      <Text style={parts.rowMuted}>
                        {m.direction === "to-school" ? "To" : m.direction === "from-school" ? "From" : "With"} {m.person}
                        {m.role ? `, ${m.role}` : ""}
                      </Text>
                    ) : null}
                    <Text style={parts.rowTitle}>{m.subject}</Text>
                    {m.summary ? <Text style={st.text}>{m.summary}</Text> : null}
                    {m.attachments.length > 0 && <Text style={st.small}>Attached: {m.attachments.map((a) => a.name).join(", ")}</Text>}
                  </Card>
                ))
            ))}
        </>
      )}
      <UpdatedNote savedAt={savedAt} offline={offline} />
    </Page>
  );
}

function PlanCard({ plan, today }: { plan: IepPlan; today: string }) {
  return (
    <Card>
      <Text style={parts.rowMuted}>{[plan.school, plan.type.toUpperCase(), plan.grade].filter(Boolean).join(" · ")}</Text>
      <View style={st.dates}>
        <View style={[st.date, { backgroundColor: "rgba(247,179,65,0.3)" }]}>
          <Text style={parts.rowMuted}>Annual review</Text>
          <Text style={st.dateValue}>{formatShortDate(plan.annualReviewDate)}</Text>
          <Text style={st.small}>{formatRelativeDays(plan.annualReviewDate, today)}</Text>
        </View>
        <View style={st.date}>
          <Text style={parts.rowMuted}>Re-evaluation due</Text>
          <Text style={st.dateValue}>{formatShortDate(plan.reevaluationDate)}</Text>
          <Text style={st.small}>{plan.reevaluationDate.slice(0, 4)}</Text>
        </View>
      </View>
      <Text style={parts.rowTitle}>IEP team{plan.caseManager ? ` · case manager ${plan.caseManager}` : ""}</Text>
      {plan.team.length === 0 ? (
        <Text style={parts.rowMuted}>No team members added.</Text>
      ) : (
        plan.team.map((t, i) => (
          <Text key={`${t.name}-${i}`} style={st.text}>
            {t.name}
            {t.role ? <Text style={{ color: colors.muted }}> · {t.role}</Text> : null}
          </Text>
        ))
      )}
      <Text style={st.small}>Plan dates come from the IEP document the school shared. Plan started {formatDate(plan.startDate)}.</Text>
    </Card>
  );
}

function GoalCard({ goal }: { goal: IepGoal }) {
  const latest = goal.progress.at(-1);
  const pct = latest ? Math.min(100, Math.max(0, latest.value)) : 0;
  const met = latest != null && latest.value >= goal.targetValue;
  return (
    <Card>
      <View style={st.row}>
        <Text style={st.area}>{goal.area.toUpperCase()}</Text>
        {met && <Badge text="Target reached" tone="good" />}
      </View>
      <Text style={st.text}>{goal.description}</Text>
      <View accessible accessibilityLabel={`${latest?.value ?? 0} ${goal.unit}, target ${goal.targetValue}`}>
        <View style={st.track}>
          <View style={[st.fill, { width: `${pct}%` }]} />
          <View style={[st.target, { left: `${Math.min(100, goal.targetValue)}%` }]} />
        </View>
        <View style={[st.row, { marginTop: 4 }]}>
          <Text style={st.small}>Baseline: {goal.baseline || "—"}</Text>
          <Text style={st.small}>Target: {goal.target}</Text>
        </View>
      </View>
      {goal.progress.length === 0 ? (
        <Text style={parts.rowMuted}>No progress reports yet.</Text>
      ) : (
        <View style={st.reports}>
          {goal.progress.map((p) => (
            <View key={p.date} style={st.report}>
              <Text style={st.small}>
                {formatShortDate(p.date)}, {p.date.slice(2, 4)}
              </Text>
              <Text style={st.dateValue}>{p.value}%</Text>
              {p.note ? <Text style={st.small}>{p.note}</Text> : null}
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

function Supports({ supports }: { supports: Accommodation[] }) {
  const services = supports.filter((s) => s.kind === "service");
  const accommodations = supports.filter((s) => s.kind === "accommodation");
  return (
    <>
      <Section>Services</Section>
      {services.length === 0 && <Text style={parts.rowMuted}>No services added.</Text>}
      {services.map((s) => {
        const delivered = s.deliveryLog.filter((l) => l.status === "delivered").length;
        const issues = s.deliveryLog.filter((l) => l.status !== "delivered").reverse();
        return (
          <Card key={s.id}>
            <View style={st.row}>
              <Text style={[parts.cardTitle, { flex: 1 }]}>{s.title}</Text>
              {s.frequency ? <Text style={parts.rowTitle}>{s.frequency}</Text> : null}
            </View>
            <Text style={parts.rowMuted}>
              {s.details}
              {s.provider ? ` · ${s.provider}` : ""}
            </Text>
            {s.deliveryLog.length > 0 ? (
              <>
                <Text style={st.text}>
                  <Text style={{ fontFamily: fonts.bold }}>
                    Fully delivered {delivered} of {s.deliveryLog.length} weeks
                  </Text>{" "}
                  since the plan started.
                </Text>
                <View style={st.squares} accessibilityLabel="Week by week">
                  {s.deliveryLog.map((l) => (
                    <View
                      key={l.date}
                      style={[st.square, squareStyle[l.status]]}
                      accessible
                      accessibilityLabel={`Week ending ${formatDate(l.date)}: ${deliveryStatusLabels[l.status]}`}
                    />
                  ))}
                </View>
                {issues.map((l) => (
                  <Text key={l.date} style={st.small}>
                    <Text style={{ fontFamily: fonts.bold, color: colors.teal }}>
                      Week ending {formatShortDate(l.date)} — {deliveryStatusLabels[l.status].toLowerCase()}
                    </Text>
                    {l.note ? `: ${l.note}` : ""}
                  </Text>
                ))}
              </>
            ) : (
              <Text style={parts.rowMuted}>Nothing logged yet.</Text>
            )}
          </Card>
        );
      })}

      <Section>Accommodations</Section>
      {accommodations.length === 0 && <Text style={parts.rowMuted}>No accommodations added.</Text>}
      {accommodations.map((a) => (
        <Card key={a.id}>
          <Text style={parts.cardTitle}>{a.title}</Text>
          {a.details ? <Text style={parts.rowMuted}>{a.details}</Text> : null}
          {[...a.deliveryLog].reverse().map((l) => (
            <Text key={l.date} style={st.small}>
              <Text style={{ fontFamily: fonts.bold, color: colors.teal }}>
                {formatDate(l.date)} — {deliveryStatusLabels[l.status]}
              </Text>
              {l.note ? `: ${l.note}` : ""}
            </Text>
          ))}
        </Card>
      ))}
    </>
  );
}

// Delivered = amber (progress), partly = amber outline, not delivered = coral (alert).
const squareStyle: Record<DeliveryStatus, object> = {
  delivered: { backgroundColor: colors.amber },
  partial: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.amber },
  missed: { backgroundColor: colors.coral },
};

const st = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  text: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.teal },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
  area: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.6, color: colors.muted },
  dates: { flexDirection: "row", gap: 10 },
  date: { flex: 1, backgroundColor: colors.white, borderRadius: radius.button, padding: 12 },
  dateValue: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.teal },
  track: { height: 12, borderRadius: 6, backgroundColor: colors.white },
  fill: { height: 12, borderRadius: 6, backgroundColor: colors.amber },
  target: { position: "absolute", top: -4, width: 3, height: 20, borderRadius: 2, backgroundColor: colors.teal, marginLeft: -1 },
  reports: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  report: { width: "47%", flexGrow: 1, backgroundColor: colors.white, borderRadius: radius.button, padding: 10 },
  squares: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  square: { width: 16, height: 16, borderRadius: 3 },
});
