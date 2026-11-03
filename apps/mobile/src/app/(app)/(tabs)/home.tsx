import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { HomeResponse } from "@lanternway/shared/api";
import { addDays, dayOfWeek, daysBetween } from "@lanternway/shared/dates";
import { formatAverage, formatLongWeekday, formatRelativeDays, formatWeekdayDate, plural } from "@lanternway/shared/format";
import { refillDueDate, summarizeCheckIns, summarizeLogs } from "@lanternway/shared/insights";
import { appetiteLabels, logKindLabels, moodLabels, ratingLabel } from "@lanternway/shared/labels";
import type { IsoDate, LogEntry } from "@lanternway/shared/types";
import { ChildHeader, Page, UpdatedNote } from "@/components/screen-parts";
import { Body, Button, Card, Notice } from "@/components/ui";
import { getHome } from "@/lib/api";
import { canLog, useCurrentChild } from "@/lib/current-child";
import { describeLog, logKindOrder, logKindSymbols, phoneToday } from "@/lib/logs";
import { discardOutboxItem, retryOutboxItem, syncOutbox, useOutbox, type OutboxItem } from "@/lib/outbox";
import { useSession } from "@/lib/session";
import { useCachedScreen } from "@/lib/use-cached-screen";
import { colors, fonts, radius } from "@/theme";

/** Today: quick log, what's logged today (including what's waiting to sync), this week, coming up. */
export default function Today() {
  const { session, refreshMe } = useSession();
  const { current } = useCurrentChild();
  const userId = session.status === "signed-in" ? session.me.user.id : "";
  const outbox = useOutbox(userId);
  const childId = current?.child.id ?? null;
  const { data, savedAt, offline, refreshing, refresh, reload } = useCachedScreen("home", userId, childId, getHome);

  // When waiting logs reach the server, load again so they show as saved.
  const waiting = outbox.filter((i) => i.status === "waiting").length;
  const lastWaiting = useRef(waiting);
  useEffect(() => {
    if (waiting < lastWaiting.current) void reload();
    lastWaiting.current = waiting;
  }, [waiting, reload]);

  if (session.status !== "signed-in") return null;
  const { user } = session.me;
  const today = data?.today ?? phoneToday();

  return (
    <Page refreshing={refreshing} onRefresh={() => refresh(() => Promise.all([refreshMe(), syncOutbox(userId)]))}>
      <ChildHeader kicker={formatLongWeekday(today)} title={`Hi ${user.name.split(" ")[0] || "there"}`} />

      {!current ? (
        <Card>
          <Text style={[s.section, { textAlign: "center" }]}>No children yet</Text>
          <Body muted>Add your first child on the Lanternway website for now. Pull down here to refresh once you have.</Body>
        </Card>
      ) : (
        <TodayBody
          data={data}
          today={today}
          role={current.role}
          childName={current.child.firstName}
          outbox={outbox.filter((i) => i.childId === current.child.id)}
          userId={userId}
        />
      )}

      <UpdatedNote savedAt={savedAt} offline={offline} offlineExtra="Logging still works, and it will sync later." />
    </Page>
  );
}

function TodayBody({ data, today, role, childName, outbox, userId }: {
  data: HomeResponse | null;
  today: IsoDate;
  role: "admin" | "log" | "view";
  childName: string;
  outbox: OutboxItem[];
  userId: string;
}) {
  const pendingLogs = outbox.filter((i) => i.collection === "logs").map((i) => ({ item: i, log: i.body as unknown as LogEntry }));
  const serverIds = new Set((data?.weekLogs ?? []).map((l) => l.id));
  const extra = pendingLogs.filter((p) => !serverIds.has(p.log.id));
  const weekFrom = addDays(today, -6);
  const weekLogs = [...(data?.weekLogs ?? []), ...extra.map((p) => p.log).filter((l) => l.date >= weekFrom && l.date <= today)];
  const todayLogs: { log: LogEntry; status?: OutboxItem["status"] }[] = [
    ...(data?.weekLogs ?? []).filter((l) => l.date === today).map((log) => ({ log })),
    ...extra.filter((p) => p.log.date === today).map((p) => ({ log: p.log, status: p.item.status })),
  ];
  const needsAttention = outbox.filter((i) => i.status === "needs-attention");
  const week = summarizeLogs(weekLogs, 7);
  const teacher = summarizeCheckIns(data?.checkIns ?? []);
  const soon = data ? comingUp(data, today) : [];
  const wins = weekLogs.filter((l) => l.kind === "win").reverse();

  return (
    <>
      {role === "view" && (
        <Notice
          tone="info"
          text={`You can see everything here. ${data?.access.adminNames.length ? data.access.adminNames.join(" or ") : "A family admin"} can make changes.`}
        />
      )}

      <Text style={s.section}>How’s {childName}’s day?</Text>
      {canLog(role) && (
        <View style={s.tiles}>
          {logKindOrder.map((kind) => (
            <Pressable
              key={kind}
              onPress={() => router.push({ pathname: "/log", params: { kind } })}
              accessibilityRole="button"
              accessibilityLabel={`Log ${logKindLabels[kind].toLowerCase()}`}
              style={({ pressed }) => [s.tile, pressed && { backgroundColor: "rgba(247,179,65,0.3)" }]}
            >
              <View style={s.tileIcon}>
                <Text style={s.tileSymbol}>{logKindSymbols[kind]}</Text>
              </View>
              <Text style={s.tileLabel}>{logKindLabels[kind]}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Card>
        <Text style={s.cardTitle}>Logged today</Text>
        {todayLogs.length === 0 ? (
          <Body muted>Nothing yet today. A few taps is plenty.</Body>
        ) : (
          todayLogs.map(({ log, status }) => (
            <View key={log.id} style={s.logRow}>
              <Text style={[s.rowTitle, { flex: 1 }]} numberOfLines={2}>
                {describeLog(log)}
              </Text>
              {status === "waiting" && <Text style={s.badge}>Waiting to sync</Text>}
              {status === "needs-attention" && <Text style={[s.badge, s.badgeProblem]}>Didn’t save</Text>}
            </View>
          ))
        )}
      </Card>

      {needsAttention.map((item) => (
        <Card key={item.id}>
          <Text style={s.cardTitle}>This one didn’t save</Text>
          <Body center={false}>{describeLog(item.body as unknown as LogEntry)}</Body>
          <Notice text={`Lanternway said: ${item.error ?? "something went wrong."} Your copy is kept here.`} />
          <Button label="Try again" onPress={() => retryOutboxItem(userId, item.id)} />
          <Button label="Remove it" kind="secondary" onPress={() => discardOutboxItem(userId, item.id)} />
        </Card>
      ))}

      <Text style={s.section}>This week</Text>
      <View style={s.stats}>
        <Stat label="Mood" value={formatAverage(week.mood)} unit="/ 5" hint={week.mood ? `Mostly “${ratingLabel(moodLabels, Math.round(week.mood))}”` : "Nothing logged yet"} />
        <Stat label="Sleep" value={formatAverage(week.sleepHours)} unit="hrs" hint={week.nightWakings != null ? `${formatAverage(week.nightWakings)} wake-ups a night` : undefined} />
        <Stat
          label="Teacher focus"
          value={formatAverage(teacher.focus)}
          unit={teacher.count > 0 ? "/ 5" : undefined}
          hint={teacher.count > 0 ? `From ${plural(teacher.count, "check-in")}, last 2 weeks` : "No teacher check-ins yet"}
        />
        <Stat
          label="Meltdowns"
          value={String(week.meltdowns)}
          hint={week.appetite ? `Appetite: ${ratingLabel(appetiteLabels, Math.round(week.appetite)).toLowerCase()}` : undefined}
        />
      </View>

      <Text style={s.section}>Coming up</Text>
      <Card>
        {soon.length === 0 ? (
          <Body muted>{data ? "Nothing in the next 30 days." : "This shows once Lanternway is reachable."}</Body>
        ) : (
          soon.map((u) => (
            <View key={`${u.title}-${u.date}`} style={s.upRow}>
              <Text style={s.rowTitle}>{u.title}</Text>
              <Text style={s.rowMuted}>
                {formatWeekdayDate(u.date)} · {formatRelativeDays(u.date, today)}
              </Text>
            </View>
          ))
        )}
      </Card>

      <Text style={s.section}>Wins this week</Text>
      <Card>
        {wins.length === 0 ? (
          <Body muted>No wins logged yet this week.</Body>
        ) : (
          wins.slice(0, 4).map((w) => (
            <Text key={w.id} style={s.rowTitle}>
              ★ {w.kind === "win" ? w.text : ""}
            </Text>
          ))
        )}
      </Card>
    </>
  );
}

function Stat({ label, value, unit, hint }: { label: string; value: string; unit?: string; hint?: string }) {
  return (
    <View style={s.stat} accessible accessibilityLabel={`${label}: ${value} ${unit ?? ""}. ${hint ?? ""}`}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>
        {value}
        {unit ? <Text style={s.statUnit}> {unit}</Text> : null}
      </Text>
      {hint ? <Text style={s.statHint}>{hint}</Text> : null}
    </View>
  );
}

const weekdayByName: Record<string, number> = { Mondays: 1, Tuesdays: 2, Wednesdays: 3, Thursdays: 4, Fridays: 5 };

/** The next 30 days: IEP review, refills, weekly therapy (the same as the website's Home). */
function comingUp(data: HomeResponse, today: IsoDate) {
  const items: { date: IsoDate; title: string }[] = [];
  if (data.iepPlan) items.push({ date: data.iepPlan.annualReviewDate, title: "IEP annual review" });
  for (const med of data.medications) {
    const due = refillDueDate(med.lastFilledOn, med.daysSupply);
    if (due) items.push({ date: due, title: `${med.name} refill` });
  }
  for (const p of data.providers) {
    const day = weekdayByName[p.schedule?.split(" ")[0] ?? ""];
    if (day) {
      const diff = (day - dayOfWeek(today) + 7) % 7 || 7;
      items.push({ date: addDays(today, diff), title: `${p.name.split(" ")[0]} · ${p.type === "ot" ? "OT" : "Speech"}` });
    }
  }
  return items.filter((u) => u.date >= today && daysBetween(today, u.date) <= 30).sort((a, b) => a.date.localeCompare(b.date));
}

const s = StyleSheet.create({
  section: { fontFamily: fonts.extrabold, fontSize: 20, color: colors.teal, marginTop: 8 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    width: "31%",
    flexGrow: 1,
    minHeight: 96,
    borderRadius: radius.card,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  tileIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  tileSymbol: { fontSize: 20, color: colors.teal },
  tileLabel: { fontFamily: fonts.bold, fontSize: 15, color: colors.teal },
  cardTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.teal },
  logRow: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 36 },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.teal },
  rowMuted: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  badge: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.teal,
    backgroundColor: "rgba(247,179,65,0.3)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  badgeProblem: { backgroundColor: "rgba(244,130,91,0.2)" },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stat: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: colors.paper,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: 14,
    gap: 2,
  },
  statLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.muted },
  statValue: { fontFamily: fonts.extrabold, fontSize: 26, color: colors.teal },
  statUnit: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted },
  statHint: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  upRow: { gap: 2, minHeight: 40 },
});
