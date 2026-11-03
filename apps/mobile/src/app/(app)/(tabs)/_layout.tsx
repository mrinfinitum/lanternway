import { Tabs } from "expo-router/tabs";
import { Text, type ColorValue } from "react-native";
import { colors, fonts } from "@/theme";

// Plain-text symbols (no icon library yet); U+FE0E keeps iOS from drawing colour emoji.
const symbol = (text: string) =>
  function TabSymbol({ color }: { color: ColorValue }) {
    return <Text style={{ fontSize: 22, lineHeight: 26, color }}>{text}</Text>;
  };

/** The tab bar: Today, Timeline, More (the same sections as the website's phone tabs, as each becomes native). */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.paper, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 12 },
        sceneStyle: { backgroundColor: colors.white },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Today", tabBarIcon: symbol("⌂︎") }} />
      <Tabs.Screen name="timeline" options={{ title: "Timeline", tabBarIcon: symbol("◷︎") }} />
      <Tabs.Screen name="more" options={{ title: "More", tabBarIcon: symbol("•••") }} />
    </Tabs>
  );
}
