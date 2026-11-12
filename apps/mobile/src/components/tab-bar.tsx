/**
 * The tab bar as a floating frosted pill (the website's phone tab bar): the current
 * tab is a teal pill with a white icon and its name, the others an icon with a small
 * label. It floats over the page, so it reports its height for pages to leave room.
 */
import { useContext } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BottomTabBarHeightCallbackContext, type BottomTabBarProps } from "expo-router/tabs";
import { colors, fonts, minTap, shadows } from "@/theme";

/** Plain-text symbols (no icon library yet); U+FE0E keeps iOS from drawing colour emoji. */
export const tabSymbols: Record<string, string> = { home: "⌂︎", timeline: "◷︎", more: "•••" };

export function FloatingTabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const reportHeight = useContext(BottomTabBarHeightCallbackContext);
  return (
    <View
      style={[st.wrap, { paddingBottom: Math.max(12, insets.bottom) }]}
      pointerEvents="box-none"
      onLayout={(e) => reportHeight?.(e.nativeEvent.layout.height)}
    >
      <View style={st.pill} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = typeof options.title === "string" ? options.title : route.name;
          const active = state.index === index;
          const onPress = () => {
            const event = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!active && !event.defaultPrevented) navigateToTab(route.key);
          };
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={() => emitter.emit({ type: "tabLongPress", target: route.key })}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={label}
              style={({ pressed }) => [active ? st.current : st.other, pressed && !active && { backgroundColor: "rgba(247,231,205,0.7)" }]}
            >
              <Text style={[st.symbol, { color: active ? colors.white : colors.muted }]}>{tabSymbols[route.name] ?? "•"}</Text>
              <Text style={active ? st.currentLabel : st.otherLabel}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 12 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    // No blur library: a light frosted white over the page instead.
    backgroundColor: "rgba(255,255,255,0.94)",
    boxShadow: shadows.lift,
  },
  current: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: minTap + 4,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: colors.teal,
    boxShadow: shadows.soft,
  },
  other: { flex: 1, height: minTap + 4, borderRadius: 999, alignItems: "center", justifyContent: "center", gap: 1 },
  symbol: { fontSize: 20, lineHeight: 23 },
  currentLabel: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
  otherLabel: { fontFamily: fonts.bold, fontSize: 11, color: colors.muted },
});
