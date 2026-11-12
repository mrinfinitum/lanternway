/**
 * Pieces the signed-in screens share: the header with the child switcher, the
 * offline / "Last updated" note, a segmented control, section titles, and the
 * record-keeping disclaimer.
 */
import { useContext, useState, type ReactNode } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DISCLAIMER } from "@lanternway/shared/disclaimer";
import { BottomTabBarHeightContext } from "expo-router/tabs";
import { Card, Notice } from "@/components/ui";
import { GradientFill, tileStops, Wash } from "@/components/warm";
import { useCurrentChild } from "@/lib/current-child";
import { useHeaderSpace } from "@/lib/header";
import { updatedAgo } from "@/lib/use-cached-screen";
import { colors, fonts, minTap, radius, shadows } from "@/theme";

/**
 * A scrolling page over the warm wash, with pull-to-refresh. `edges` is "top" for tab screens without a
 * navigation bar, and empty under a (see-through) bar. The end of the page stays clear of the floating tab bar.
 */
export function Page({ children, refreshing, onRefresh, edges = ["top"] }: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: ("top" | "bottom")[];
}) {
  const headerSpace = useHeaderSpace(!edges.includes("top"));
  const tabBar = useContext(BottomTabBarHeightContext) ?? 0;
  return (
    <View style={s.page}>
      <Wash />
      <SafeAreaView style={s.page} edges={edges}>
        <ScrollView
          contentContainerStyle={[s.content, headerSpace.padding, { paddingBottom: tabBar + 24 }]}
          contentInsetAdjustmentBehavior={headerSpace.insetBehavior}
          scrollIndicatorInsets={{ bottom: tabBar }}
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.teal} /> : undefined}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/** The screen's title (with a small line above it) and the current child, who can be switched when there are several. */
export function ChildHeader({ kicker, title, big = false }: { kicker?: string; title: string; big?: boolean }) {
  const { kids, current, select } = useCurrentChild();
  const [picking, setPicking] = useState(false);
  return (
    <>
      {/* The small line runs the full width, so a long date never wraps beside the child. */}
      {kicker ? <Text style={[s.kicker, { marginTop: 8, marginBottom: -12 }]}>{kicker}</Text> : null}
      <View style={s.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[s.title, big && s.bigTitle]} accessibilityRole="header">
            {title}
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
              accessibilityState={{ selected: k.child.id === current?.child.id }}
              style={s.pickRow}
            >
              <Text style={[s.rowTitle, k.child.id === current?.child.id && { textDecorationLine: "underline" }]}>{k.child.firstName}</Text>
              <Text style={s.rowMuted}>{k.role === "admin" ? "Admin" : k.role === "log" ? "Can log" : "Can view"}</Text>
            </Pressable>
          ))}
        </Card>
      )}
    </>
  );
}

/** "Last updated …", or the offline note when Lanternway couldn't be reached. */
export function UpdatedNote({ savedAt, offline, offlineExtra = "" }: { savedAt: string | null; offline: boolean; offlineExtra?: string }) {
  if (offline) {
    return (
      <Notice
        tone="info"
        text={
          savedAt
            ? `You’re offline or Lanternway is busy. Showing what was saved ${updatedAgo(savedAt)}.${offlineExtra ? ` ${offlineExtra}` : ""}`
            : `You’re offline or Lanternway is busy. This shows once Lanternway is reachable.${offlineExtra ? ` ${offlineExtra}` : ""}`
        }
      />
    );
  }
  return savedAt ? <Text style={s.updated}>Last updated {updatedAgo(savedAt)}</Text> : null;
}

/** A row of choices, one selected (cream track, teal for the chosen one). */
export function Segmented<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={s.track} accessibilityRole="tablist" accessibilityLabel={label}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[s.segment, on && { backgroundColor: colors.teal }]}
          >
            <Text style={[s.segmentText, on && { color: colors.white }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Section({ children }: { children: ReactNode }) {
  return (
    <Text style={s.section} accessibilityRole="header">
      {children}
    </Text>
  );
}

/** A row that opens another screen: the white-to-cream tile with a soft shadow ("tap this"). */
export function NavRow({ label, hint, onPress }: { label: string; hint?: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint={hint}
      style={({ pressed }) => [s.navRow, pressed && { opacity: 0.8 }]}
    >
      <GradientFill stops={tileStops} radius={radius.card} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.navLabel}>{label}</Text>
        {hint ? <Text style={s.rowMuted}>{hint}</Text> : null}
      </View>
      <Text style={s.navChev}>›</Text>
    </Pressable>
  );
}

/** A small pill: amber for good news, coral for a problem, white otherwise. */
export function Badge({ text, tone = "plain" }: { text: string; tone?: "plain" | "good" | "problem" | "selected" }) {
  const bg = { plain: colors.white, good: "rgba(247,179,65,0.35)", problem: "rgba(244,130,91,0.2)", selected: colors.teal }[tone];
  return (
    <Text style={[s.badge, { backgroundColor: bg }, tone === "plain" && { borderWidth: 1, borderColor: colors.border }, tone === "selected" && { color: colors.white }]}>
      {text}
    </Text>
  );
}

/** A label above a value, for details on a card. */
export function Detail({ label, value, half = true }: { label: string; value?: string; half?: boolean }) {
  return (
    <View style={half ? { width: "50%", paddingRight: 8 } : undefined}>
      <Text style={s.rowMuted}>{label}</Text>
      <Text style={s.rowTitle}>{value || "—"}</Text>
    </View>
  );
}

/** A choice shown as a card: cream to tap, a teal border when it's the one picked. */
export function OptionCard({ title, hint, selected, onPress }: { title: string; hint?: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[s.option, selected && { borderColor: colors.teal }]}
    >
      <Text style={s.rowTitle}>{title}</Text>
      {hint ? <Text style={s.rowMuted}>{hint}</Text> : null}
    </Pressable>
  );
}

/** The phone's own confirm dialog. Resolves true when the person picks the action. */
export function confirm(title: string, message: string, action: string, destructive = false): Promise<boolean> {
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: action, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
    ]),
  );
}

export function Disclaimer() {
  return <Text style={s.disclaimer}>{DISCLAIMER}</Text>;
}

export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "transparent" },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
  kicker: { fontFamily: fonts.semibold, fontSize: 14, color: colors.muted },
  title: { fontFamily: fonts.extrabold, fontSize: 28, color: colors.teal },
  bigTitle: { fontSize: 34, lineHeight: 40, letterSpacing: -0.4 },
  childChip: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: minTap, paddingHorizontal: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.amber, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.teal },
  childName: { fontFamily: fonts.bold, fontSize: 17, color: colors.teal },
  chev: { fontFamily: fonts.bold, fontSize: 14, color: colors.teal },
  pickRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: minTap },
  section: { fontFamily: fonts.extrabold, fontSize: 20, color: colors.teal, marginTop: 8 },
  cardTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.teal },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.teal },
  rowMuted: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.muted },
  updated: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, textAlign: "center" },
  track: { flexDirection: "row", backgroundColor: colors.cream, borderRadius: 999, padding: 4, gap: 4 },
  segment: { flex: 1, minHeight: minTap - 4, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  segmentText: { fontFamily: fonts.bold, fontSize: 15, color: colors.teal },
  /** A white box nested inside a paper card. */
  inner: { backgroundColor: colors.white, borderRadius: radius.button, padding: 12, gap: 6 },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: minTap + 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    boxShadow: shadows.soft,
  },
  navLabel: { fontFamily: fonts.bold, fontSize: 17, color: colors.teal },
  navChev: { fontFamily: fonts.bold, fontSize: 26, color: colors.teal },
  badge: {
    alignSelf: "flex-start",
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.teal,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  option: {
    minHeight: minTap,
    backgroundColor: colors.cream,
    borderRadius: radius.button,
    borderWidth: 2,
    borderColor: colors.cream,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 2,
  },
  disclaimer: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted, textAlign: "center", marginTop: 8 },
});
