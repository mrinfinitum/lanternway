import { Stack } from "expo-router";
import { colors, fonts } from "@/theme";

/** The More tab: a list of the other native screens, each opening inside this tab. */
export default function MoreLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.white },
        headerShadowVisible: false,
        headerTintColor: colors.teal,
        headerBackButtonDisplayMode: "minimal",
        headerStyle: { backgroundColor: colors.white },
        headerTitleStyle: { fontFamily: fonts.bold, color: colors.teal },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      {/* The screen shows its own big title; the bar keeps only the back button. */}
      <Stack.Screen name="medications/index" options={{ title: "" }} />
      <Stack.Screen name="medications/[medId]" options={{ title: "Dose history" }} />
    </Stack>
  );
}
