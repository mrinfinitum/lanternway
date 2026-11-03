import { Stack } from "expo-router";
import { colors } from "@/theme";

/** The signed-in app. Quick log, Today and the rest arrive from M5. */
export default function AppLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.white } }} />;
}
