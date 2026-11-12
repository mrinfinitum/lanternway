import { Tabs } from "expo-router/tabs";
import { FloatingTabBar } from "@/components/tab-bar";
import { colors } from "@/theme";

/** The tabs: Today, Timeline, More (the same sections as the website's phone tabs, as each becomes native), in a floating pill. */
export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.page } }}>
      <Tabs.Screen name="home" options={{ title: "Today" }} />
      <Tabs.Screen name="timeline" options={{ title: "Timeline" }} />
      <Tabs.Screen name="more" options={{ title: "More" }} />
    </Tabs>
  );
}
