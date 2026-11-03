import { router } from "expo-router";
import { Text, View } from "react-native";
import type { TherapyResponse } from "@lanternway/shared/api";
import { formatDate } from "@lanternway/shared/format";
import { providerTypeLabels } from "@lanternway/shared/labels";
import { CareCalendar } from "@/components/care-calendar";
import { ChildHeader, NavRow, Page, Section, UpdatedNote, s as parts } from "@/components/screen-parts";
import { Body, Card } from "@/components/ui";
import { getTherapy } from "@/lib/api";
import { useCurrentChild } from "@/lib/current-child";
import { phoneToday } from "@/lib/logs";
import { useSession } from "@/lib/session";
import { useCachedScreen } from "@/lib/use-cached-screen";

/** Therapy & care team: everyone who supports the child, then the calendar of sessions and usual appointments. */
export default function Therapy() {
  const { session, refreshMe } = useSession();
  const { current } = useCurrentChild();
  const userId = session.status === "signed-in" ? session.me.user.id : "";
  const { data, savedAt, offline, refreshing, refresh } = useCachedScreen<TherapyResponse>("therapy", userId, current?.child.id ?? null, getTherapy);

  if (!current) return null;
  const childName = current.child.firstName;
  const today = data?.today ?? phoneToday();
  const team = (data?.providers ?? []).filter((p) => !p.endDate);
  const past = (data?.providers ?? []).filter((p) => p.endDate);

  const summary = (providerId: string) => {
    const goals = data?.goals.filter((g) => g.providerId === providerId) ?? [];
    const last = data?.sessions.filter((s) => s.providerId === providerId).sort((a, b) => a.date.localeCompare(b.date)).at(-1);
    return [
      goals.length ? `${goals.filter((g) => g.status === "active").length} of ${goals.length} goals in progress` : "",
      last ? `Last session ${formatDate(last.date)}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  };
  const open = (providerId: string) => router.push({ pathname: "/more/therapy/[providerId]", params: { providerId } });

  return (
    <Page edges={[]} refreshing={refreshing} onRefresh={() => refresh(refreshMe)}>
      <ChildHeader title="Therapy & care team" />
      <Body muted center={false}>Everyone who supports {childName}, their goals, and session notes.</Body>

      {!data ? (
        <Card>
          <Body muted>{offline ? "The care team shows once Lanternway is reachable." : "Loading…"}</Body>
        </Card>
      ) : (
        <>
          {team.length === 0 ? (
            <Card>
              <Text style={parts.cardTitle}>No one on {childName}’s care team yet.</Text>
              <Text style={parts.rowMuted}>When therapists and doctors are added on the Lanternway website, they’ll show here.</Text>
            </Card>
          ) : (
            <View style={{ gap: 10 }}>
              {team.map((p) => (
                <NavRow
                  key={p.id}
                  label={p.name}
                  hint={[providerTypeLabels[p.type], p.schedule, summary(p.id)].filter(Boolean).join(" · ")}
                  onPress={() => open(p.id)}
                />
              ))}
            </View>
          )}

          {past.length > 0 && (
            <>
              <Section>Past care team</Section>
              <View style={{ gap: 10 }}>
                {past.map((p) => (
                  <NavRow
                    key={p.id}
                    label={p.name}
                    hint={`${providerTypeLabels[p.type]} · ${formatDate(p.startDate)} – ${formatDate(p.endDate!)}`}
                    onPress={() => open(p.id)}
                  />
                ))}
              </View>
            </>
          )}

          <Section>Calendar</Section>
          <CareCalendar
            childName={childName}
            today={today}
            medications={data.medications}
            changes={data.medicationChanges}
            reminders={data.reminders}
            providers={data.providers}
            sessions={data.sessions}
            initialLayers={["therapy"]}
          />
        </>
      )}

      <UpdatedNote savedAt={savedAt} offline={offline} />
    </Page>
  );
}
