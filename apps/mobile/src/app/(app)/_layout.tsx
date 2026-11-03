import { Stack } from "expo-router";
import { useEffect } from "react";
import { AppState } from "react-native";
import { CurrentChildProvider } from "@/lib/current-child";
import { listOutbox, syncOutbox } from "@/lib/outbox";
import { useSession } from "@/lib/session";
import { colors, fonts } from "@/theme";

/** The signed-in app. Sends waiting logs when it opens, comes back to the front, and every 30 seconds while any wait. */
export default function AppLayout() {
  const { session } = useSession();
  const userId = session.status === "signed-in" ? session.me.user.id : null;

  useEffect(() => {
    if (!userId) return;
    const sync = () => void syncOutbox(userId);
    sync();
    const onState = AppState.addEventListener("change", (state) => state === "active" && sync());
    const timer = setInterval(() => {
      listOutbox(userId).then((items) => items.some((i) => i.status === "waiting") && sync(), () => undefined);
    }, 30_000);
    return () => {
      onState.remove();
      clearInterval(timer);
    };
  }, [userId]);

  return (
    <CurrentChildProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.white },
          headerShadowVisible: false,
          headerTintColor: colors.teal,
          headerBackButtonDisplayMode: "minimal",
          headerStyle: { backgroundColor: colors.white },
          headerTitleStyle: { fontFamily: fonts.bold, color: colors.teal },
        }}
      >
        <Stack.Screen name="home" />
        <Stack.Screen name="log" options={{ headerShown: true }} />
      </Stack>
    </CurrentChildProvider>
  );
}
