import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { TimelineResponse } from "@lanternway/shared/api";
import { formatTime, formatWeekdayDate } from "@lanternway/shared/format";
import { logEvent, timelineEvents, timelineView, zoomOptions, type TimelineEvent, type Zoom } from "@lanternway/shared/timeline";
import type { LogEntry } from "@lanternway/shared/types";
import { ChildHeader, Page, Section, Segmented, UpdatedNote, s as parts } from "@/components/screen-parts";
import { Body, Card } from "@/components/ui";
import { getTimeline } from "@/lib/api";
import { useCurrentChild } from "@/lib/current-child";
import { phoneToday } from "@/lib/logs";
import { useOutbox } from "@/lib/outbox";
import { useSession } from "@/lib/session";
import { useCachedScreen } from "@/lib/use-cached-screen";
import { colors, fonts } from "@/theme";

// A symbol and fill per kind of row (the website uses icons; the phone has no icon library yet).
const categoryStyle: Record<TimelineEvent["category"], { symbol: string; bg: string; fg?: string; ring?: boolean }> = {
  diagnosis: { symbol: "⚑︎", bg: colors.teal, fg: colors.paper },
  medication: { symbol: "●\uFE0E", bg: "rgba(244,130,91,0.4)" },
  school: { symbol: "✎︎", bg: "rgba(3,66,81,0.15)" },
  therapy: { symbol: "♡︎", bg: "rgba(3,66,81,0.15)" },
  milestone: { symbol: "✦︎", bg: colors.amber },
  win: { symbol: "★︎", bg: colors.amber },
  meltdown: { symbol: "≈", bg: colors.white, ring: true },
  "check-in": { symbol: "✓︎", bg: "rgba(3,66,81,0.15)" },
  note: { symbol: "✎︎", bg: colors.white, ring: true },
  visit: { symbol: "+", bg: "rgba(244,130,91,0.4)" },
  day: { symbol: "·", bg: colors.white, ring: true },
};

/** Timeline: the child's journey, zoomed from this week out to every year (the same rows as the website). */
export default function Timeline() {
  const { session, refreshMe } = useSession();
  const { current } = useCurrentChild();
  const userId = session.status === "signed-in" ? session.me.user.id : "";
  const childId = current?.child.id ?? null;
  const outbox = useOutbox(userId);
  const { data, savedAt, offline, refreshing, refresh } = useCachedScreen<TimelineResponse>("timeline", userId, childId, getTimeline);
  const [zoom, setZoom] = useState<Zoom>("month");

  const events = useMemo(() => {
    if (!data) return [];
    // Wins, notes and meltdowns logged on this phone show up before they've synced.
    const serverIds = new Set(data.logs.map((l) => l.id));
    const local = outbox
      .filter((i) => i.childId === childId && i.collection === "logs" && !serverIds.has(i.id))
      .map((i) => logEvent(i.body as unknown as LogEntry))
      .filter((e): e is TimelineEvent => e !== null);
    return [...timelineEvents(data), ...local];
  }, [data, outbox, childId]);

  if (session.status !== "signed-in") return null;
  const today = data?.today ?? phoneToday();
  const { upcoming, groups } = timelineView(events, zoom, today, current?.child.birthDate ?? today);

  return (
    <Page refreshing={refreshing} onRefresh={() => refresh(refreshMe)}>
      <ChildHeader title="Timeline" />
      {current && <Body muted center={false}>{current.child.firstName}’s journey so far — zoom out to see the whole picture.</Body>}

      <Segmented label="Zoom" options={zoomOptions} value={zoom} onChange={setZoom} />

      {upcoming.length > 0 && (
        <View style={st.upcoming}>
          <Text style={parts.cardTitle}>Coming up</Text>
          {upcoming.map((e) => (
            <Text key={e.id} style={st.upText}>
              <Text style={{ fontFamily: fonts.bold }}>
                {formatWeekdayDate(e.date)}, {e.date.slice(0, 4)}:
              </Text>{" "}
              {e.title}
            </Text>
          ))}
        </View>
      )}

      {!data ? (
        <Card>
          <Body muted>{offline ? "The timeline shows once Lanternway is reachable." : "Loading…"}</Body>
        </Card>
      ) : groups.length === 0 ? (
        <Body muted center={false}>Nothing recorded in this period.</Body>
      ) : (
        groups.map((g) => (
          <View key={g.key} style={{ gap: 10 }}>
            <Section>{g.label}</Section>
            <View style={st.rail}>
              {g.items.map((e) => (
                <Row key={e.id} event={e} zoom={zoom} />
              ))}
            </View>
          </View>
        ))
      )}

      <UpdatedNote savedAt={savedAt} offline={offline} />
    </Page>
  );
}

function Row({ event: e, zoom }: { event: TimelineEvent; zoom: Zoom }) {
  const style = categoryStyle[e.category];
  const far = zoom === "all" || zoom === "year";
  const summary = e.level === "summary";
  return (
    <View style={st.row} accessible accessibilityLabel={[e.title, e.detail, far ? formatWeekdayDate(e.date) : ""].filter(Boolean).join(". ")}>
      <View style={[st.dot, { backgroundColor: style.bg }, style.ring && st.dotRing]}>
        <Text style={[st.dotSymbol, style.fg ? { color: style.fg } : null]}>{style.symbol}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={summary ? parts.rowMuted : [st.title, e.level === "major" && { fontSize: 17 }]}>
          {e.title}
          {e.time && e.time !== "00:00" && !far ? <Text style={st.time}>{"  "}{formatTime(e.time)}</Text> : null}
        </Text>
        {e.detail ? <Text style={parts.rowMuted}>{e.detail}</Text> : null}
        {far ? <Text style={st.time}>{formatWeekdayDate(e.date)}</Text> : null}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  upcoming: { backgroundColor: "rgba(247,179,65,0.2)", borderRadius: 16, padding: 16, gap: 4 },
  upText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.teal },
  rail: { borderLeftWidth: 2, borderLeftColor: colors.border, marginLeft: 14, paddingLeft: 22, gap: 14 },
  row: { flexDirection: "row", gap: 10 },
  dot: { position: "absolute", left: -37, top: 0, width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  dotRing: { borderWidth: 1, borderColor: colors.border },
  dotSymbol: { fontSize: 13, color: colors.teal, fontFamily: fonts.bold },
  title: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22, color: colors.teal },
  time: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
});
