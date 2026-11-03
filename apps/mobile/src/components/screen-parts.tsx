/**
 * Pieces the signed-in screens share: the header with the child switcher, the
 * offline / "Last updated" note, a segmented control, section titles, and the
 * record-keeping disclaimer.
 */
import { useState, type ReactNode } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DISCLAIMER } from "@lanternway/shared/disclaimer";
import { Card, Notice } from "@/components/ui";
import { useCurrentChild } from "@/lib/current-child";
import { updatedAgo } from "@/lib/use-cached-screen";
import { colors, fonts, minTap, radius } from "@/theme";

/** A scrolling page with pull-to-refresh. `edges` is "top" for tab screens without a navigation bar. */
export function Page({ children, refreshing, onRefresh, edges = ["top"] }: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: ("top" | "bottom")[];
}) {
  return (
    <SafeAreaView style={s.page} edges={edges}>
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.teal} /> : undefined}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

/** The screen's title (with a small line above it) and the current child, who can be switched when there are several. */
export function ChildHeader({ kicker, title }: { kicker?: string; title: string }) {
  const { kids, current, select } = useCurrentChild();
  const [picking, setPicking] = useState(false);
  return (
    <>
      <View style={s.headerRow}>
        <View style={{ flex: 1 }}>
          {kicker ? <Text style={s.kicker}>{kicker}</Text> : null}
          <Text style={s.title} accessibilityRole="header">
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

export function Disclaimer() {
  return <Text style={s.disclaimer}>{DISCLAIMER}</Text>;
}

export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
  kicker: { fontFamily: fonts.semibold, fontSize: 14, color: colors.muted },
  title: { fontFamily: fonts.extrabold, fontSize: 28, color: colors.teal },
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
  disclaimer: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted, textAlign: "center", marginTop: 8 },
});
