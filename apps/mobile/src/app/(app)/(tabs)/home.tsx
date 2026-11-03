import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { HomeResponse } from "@lanternway/shared/api";
import { addDays, dayOfWeek, daysBetween } from "@lanternway/shared/dates";
import { formatAverage, formatLongWeekday, formatRelativeDays, formatWeekdayDate, plural } from "@lanternway/shared/format";
import { refillDueDate, summarizeCheckIns, summarizeLogs } from "@lanternway/shared/insights";
import { appetiteLabels, logKindLabels, moodLabels, ratingLabel } from "@lanternway/shared/labels";
import type { IsoDate, LogEntry } from "@lanternway/shared/types";
import { Body, Button, Card, Notice } from "@/components/ui";
import { getHome } from "@/lib/api";
import { canLog, useCurrentChild } from "@/lib/current-child";
import { readCache, writeCache } from "@/lib/local-db";
import { describeLog, logKindOrder, logKindSymbols, phoneToday } from "@/lib/logs";
import { discardOutboxItem, retryOutboxItem, syncOutbox, useOutbox, type OutboxItem } from "@/lib/outbox";
import { useSession } from "@/lib/session";
import { colors, fonts, minTap, radius } from "@/theme";

type Loaded = { data: HomeResponse; savedAt: string; childId: string };

/** Today: quick log, what's logged today (including what's waiting to sync), this week, coming up. */
export default function Today() {
  const { session, signOut, refreshMe } = useSession();
  const { kids, current, select } = useCurrentChild();
  const userId = session.status === "signed-in" ? session.me.user.id : "";
  const outbox = useOutbox(userId);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [picking, setPicking] = useState(false);
  const childId = current?.child.id ?? null;

  const load = useCallback(async () => {
    if (!childId || !userId) return;
    const key = `home:${childId}`;
    const cached = await readCache<HomeResponse>(userId, key);
    if (cached) setLoaded((prev) => (prev?.childId === childId ? prev : { data: cached.body, savedAt: cached.savedAt, childId }));
    const result = await getHome(childId);
    if (result.ok) {
      const savedAt = await writeCache(userId, key, result.data);
      setLoaded({ data: result.data, savedAt, childId });
      setOffline(false);
    } else if (result.status !== 401) {
      setOffline(true);
    }
  }, [childId, userId]);

  // Load when the screen shows (e.g. back from logging) and when the child changes.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // When waiting logs reach the server, load again so they show as saved.
  const waiting = outbox.filter((i) => i.status === "waiting").length;
  const lastWaiting = useRef(waiting);
  useEffect(() => {
    if (waiting < lastWaiting.current) void load();
    lastWaiting.current = waiting;
  }, [waiting, load]);

  async function refresh() {
    setRefreshing(true);
    await Promise.all([refreshMe(), syncOutbox(userId)]);
    await load();
    setRefreshing(false);
  }

  if (session.status !== "signed-in") return null;
  const { user } = session.me;
  const today = (loaded?.childId === childId ? loaded.data.today : null) ?? phoneToday();
  const data = loaded?.childId === childId ? loaded.data : null;

  return (
    <SafeAreaView style={s.page} edges={["top"]}>
      <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.teal} />}>
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.date}>{formatLongWeekday(today)}</Text>
            <Text style={s.hello} accessibilityRole="header">
              Hi {user.name.split(" ")[0] || "there"}
            </Text>
          </View>
          {current && (
            <Pressable
              onPress={() => kids.length > 1 && setPicking(!picking)}
              accessibilityRole={kids.length > 1 ? "button" : "text"}
              accessibilityLabel={kids.length > 1 ? `Viewing ${current.child.firstName}. Switch child` : `Viewing ${current.child.firstName}`}
              style={s.childChip}
            >
              <View style={s.avatar}>
                <Text style={s.avatarText}>{current.child.firstName.slice(0, 1)}</Text>
              </View>
              <Text style={s.childName}>{current.child.firstName}</Text>
              {kids.length > 1 && <Text style={s.chev}>{picking ? "▴" : "▾"}</Text>}
            </Pressable>
          )}
        </View>

        {picking && (
          <Card>
            {kids.map((k) => (
              <Pressable
                key={k.child.id}
                onPress={() => {
                  select(k.child.id);
                  setPicking(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: k.child.id === childId }}
                style={s.pickRow}
              >
                <Text style={[s.rowTitle, k.child.id === childId && { textDecorationLine: "underline" }]}>{k.child.firstName}</Text>
                <Text style={s.rowMuted}>{k.role === "admin" ? "Admin" : k.role === "log" ? "Can log" : "Can view"}</Text>
              </Pressable>
            ))}
          </Card>
        )}

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

        {offline && (
          <Notice
            tone="info"
            text={
              loaded?.childId === childId
                ? `You’re offline or Lanternway is busy. Showing what was saved ${updatedAgo(loaded.savedAt)}. Logging still works.`
                : "You’re offline or Lanternway is busy. Logging still works, and it will sync later."
            }
          />
        )}
        {loaded?.childId === childId && !offline && <Text style={s.updated}>Last updated {updatedAgo(loaded.savedAt)}</Text>}

        <Text style={[s.rowMuted, { textAlign: "center", marginTop: 16 }]}>Signed in as {user.email}</Text>
        <Button label="Sign out" kind="secondary" onPress={signOut} />
      </ScrollView>
    </SafeAreaView>
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

function updatedAgo(iso: string): string {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
  date: { fontFamily: fonts.semibold, fontSize: 14, color: colors.muted },
  hello: { fontFamily: fonts.extrabold, fontSize: 28, color: colors.teal },
  childChip: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: minTap, paddingHorizontal: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.amber, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.teal },
  childName: { fontFamily: fonts.bold, fontSize: 17, color: colors.teal },
  chev: { fontFamily: fonts.bold, fontSize: 14, color: colors.teal },
  pickRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: minTap },
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
  updated: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, textAlign: "center" },
});
