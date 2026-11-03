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
      {/* Screens with their own big title keep only the back button in the bar. */}
      <Stack.Screen name="medications/index" options={{ title: "" }} />
      <Stack.Screen name="medications/[medId]" options={{ title: "Dose history" }} />
      <Stack.Screen name="therapy/index" options={{ title: "" }} />
      <Stack.Screen name="therapy/[providerId]" options={{ title: "Care team" }} />
      <Stack.Screen name="school" options={{ title: "" }} />
      <Stack.Screen name="about-me/index" options={{ title: "About Me" }} />
      <Stack.Screen name="about-me/edit" options={{ title: "Edit" }} />
      <Stack.Screen name="family" options={{ title: "" }} />
      <Stack.Screen name="account" options={{ title: "" }} />
    </Stack>
  );
}
