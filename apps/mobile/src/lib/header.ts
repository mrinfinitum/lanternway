/**
 * The navigation bars are see-through so the warm wash runs behind them (iOS adds
 * its own soft edge as content scrolls under). These are the shared bar options,
 * and how a scrolling page keeps its first lines clear of the bar.
 */
import { useContext } from "react";
import { Platform } from "react-native";
import { HeaderHeightContext } from "expo-router/react-navigation";
import { colors, fonts } from "@/theme";

export const stackHeader = {
  headerTransparent: true,
  headerShadowVisible: false,
  headerTintColor: colors.teal,
  headerBackButtonDisplayMode: "minimal",
  // Android has no edge effect, so its bar is frosted warm white instead.
  headerStyle: { backgroundColor: Platform.OS === "android" ? "rgba(255,250,244,0.92)" : "transparent" },
  headerTitleStyle: { fontFamily: fonts.bold, color: colors.teal },
  contentStyle: { backgroundColor: colors.page },
} as const;

/** iOS insets the scroll view for the bar by itself; Android needs the bar's height as top padding. */
export function useHeaderSpace(underHeader: boolean) {
  const height = useContext(HeaderHeightContext) ?? 0;
  if (!underHeader) return { padding: undefined, insetBehavior: undefined };
  return Platform.OS === "ios"
    ? { padding: undefined, insetBehavior: "automatic" as const }
    : { padding: { paddingTop: height + 12 }, insetBehavior: undefined };
}
