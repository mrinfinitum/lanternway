import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import type { TherapyResponse } from "@lanternway/shared/api";
import { formatDate, formatWeekdayDate } from "@lanternway/shared/format";
import { providerTypeLabels } from "@lanternway/shared/labels";
import { dialable, telHref } from "@lanternway/shared/refills";
import type { GoalStatus, TherapyGoal } from "@lanternway/shared/types";
import { Badge, Detail, Page, Section, UpdatedNote, s as parts } from "@/components/screen-parts";
import { Body, Button, Card } from "@/components/ui";
import { getTherapy } from "@/lib/api";
import { useCurrentChild } from "@/lib/current-child";
import { useSession } from "@/lib/session";
import { useCachedScreen } from "@/lib/use-cached-screen";
import { colors, fonts } from "@/theme";

// The website's wording (apps/web/src/app/(app)/therapy/[providerId]/page.tsx).
const statusLabels: Record<GoalStatus, string> = { active: "Working on it", met: "Met", paused: "Paused", ended: "Ended" };
const PAGE = 8;

/** One provider: who they are, their goals with progress, and session notes (newest first). */
export default function Provider() {
  const { providerId } = useLocalSearchParams<{ providerId: string }>();
  const { session } = useSession();
  const { current } = useCurrentChild();
  const userId = session.status === "signed-in" ? session.me.user.id : "";
  const { data, savedAt, offline, refreshing, refresh } = useCachedScreen<TherapyResponse>("therapy", userId, current?.child.id ?? null, getTherapy);
  const [shown, setShown] = useState(PAGE);

  const provider = data?.providers.find((p) => p.id === providerId);
  const goals = data?.goals.filter((g) => g.providerId === providerId) ?? [];
  const sessions = (data?.sessions.filter((s) => s.providerId === providerId) ?? []).sort((a, b) => b.date.localeCompare(a.date));
  const goalTitle = (id: string) => goals.find((g) => g.id === id)?.title;

  return (
    <Page edges={[]} refreshing={refreshing} onRefresh={() => refresh()}>
      <Stack.Screen options={{ title: provider?.name ?? "Care team" }} />
      {!data ? (
        <Card>
          <Body muted>{offline ? "This shows once Lanternway is reachable." : "Loading…"}</Body>
        </Card>
      ) : !provider ? (
        <Card>
          <Body muted>We couldn’t find this person on the care team. They may have been removed.</Body>
        </Card>
      ) : (
        <>
          <View style={{ gap: 6 }}>
            <Badge text={providerTypeLabels[provider.type]} />
            <Text style={parts.title} accessibilityRole="header">
              {provider.name}
              {provider.credentials ? <Text style={st.credentials}>, {provider.credentials}</Text> : null}
            </Text>
            {provider.practice ? <Text style={parts.rowMuted}>{provider.practice}</Text> : null}
          </View>
          <Card>
            <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 10 }}>
              <Detail label="Schedule" value={provider.endDate ? "No longer seeing them" : provider.schedule} />
              <Detail
                label={`With ${current?.child.firstName ?? "them"} since`}
                value={`${formatDate(provider.startDate)}${provider.endDate ? ` – ${formatDate(provider.endDate)}` : ""}`}
              />
            </View>
            {dialable(provider.phone) ? (
              <Button label={`Call ${provider.phone}`} kind="secondary" onPress={() => void Linking.openURL(telHref(provider.phone)).catch(() => undefined)} />
            ) : (
              <Text style={parts.rowMuted}>No phone added</Text>
            )}
            {provider.email ? (
              <Button label={`Email ${provider.email}`} kind="secondary" onPress={() => void Linking.openURL(`mailto:${provider.email}`).catch(() => undefined)} />
            ) : null}
          </Card>

          {goals.length > 0 && (
            <>
              <Section>Goals</Section>
              {goals.map((g) => (
                <GoalCard key={g.id} goal={g} />
              ))}
            </>
          )}

          <Section>Session notes</Section>
          {sessions.length === 0 ? (
            <Body muted center={false}>No sessions logged yet.</Body>
          ) : (
            sessions.slice(0, shown).map((s) => (
              <Card key={s.id}>
                <View style={st.sessionTop}>
                  <Text style={parts.rowTitle}>
                    {formatWeekdayDate(s.date)}
                    {s.date.slice(0, 4) !== sessions[0].date.slice(0, 4) ? `, ${s.date.slice(0, 4)}` : ""}
                  </Text>
                  {s.durationMinutes ? <Text style={parts.rowMuted}>{s.durationMinutes} min</Text> : null}
                </View>
                {s.summary ? <Text style={st.text}>{s.summary}</Text> : null}
                {s.goalIds.length > 0 && (
                  <Text style={parts.rowMuted}>Worked on: {s.goalIds.map(goalTitle).filter(Boolean).join(", ")}</Text>
                )}
                {s.practiceAtHome ? (
                  <View style={st.home}>
                    <Text style={st.text}>
                      <Text style={{ fontFamily: fonts.bold }}>To try at home: </Text>
                      {s.practiceAtHome}
                    </Text>
                  </View>
                ) : null}
              </Card>
            ))
          )}
          {shown < sessions.length && (
            <Button label={`Show older sessions (${sessions.length - shown} more)`} kind="secondary" onPress={() => setShown(shown + PAGE)} />
          )}
        </>
      )}
      <UpdatedNote savedAt={savedAt} offline={offline} />
    </Page>
  );
}

function GoalCard({ goal }: { goal: TherapyGoal }) {
  const latest = goal.progress.at(-1);
  const first = goal.progress[0];
  const notes = goal.progress.filter((p) => p.note);
  return (
    <Card>
      <View style={st.sessionTop}>
        <Text style={[parts.cardTitle, { flex: 1 }]}>{goal.title}</Text>
        <Badge text={statusLabels[goal.status]} tone={goal.status === "met" ? "good" : "plain"} />
      </View>
      {goal.description ? <Text style={st.text}>{goal.description}</Text> : null}
      {latest && (
        <View style={{ gap: 4 }} accessible accessibilityLabel={`${goal.title}: ${latest.percent}% toward the goal`}>
          <View style={st.sessionTop}>
            <Text style={parts.rowMuted}>Progress toward goal</Text>
            <Text style={parts.rowTitle}>{latest.percent}%</Text>
          </View>
          <View style={st.track}>
            <View style={[st.fill, { width: `${Math.min(100, Math.max(0, latest.percent))}%` }]} />
          </View>
          <Text style={st.small}>
            {first && first !== latest ? `Started at ${first.percent}% on ${formatDate(first.date)}. ` : ""}
            Last update {formatDate(latest.date)}.
          </Text>
        </View>
      )}
      {notes.map((n) => (
        <Text key={n.date} style={st.small}>
          <Text style={{ fontFamily: fonts.bold }}>{formatDate(n.date)}: </Text>
          {n.note}
        </Text>
      ))}
    </Card>
  );
}

const st = StyleSheet.create({
  credentials: { fontFamily: fonts.semibold, fontSize: 18, color: colors.muted },
  sessionTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 8 },
  text: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.teal },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
  home: { backgroundColor: "rgba(247,179,65,0.2)", borderRadius: 12, padding: 12 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.white, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.amber },
});
