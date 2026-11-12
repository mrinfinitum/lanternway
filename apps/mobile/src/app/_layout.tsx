import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, useFonts } from "@expo-google-fonts/nunito";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { Body, Button, Screen, Title } from "@/components/ui";
import { SessionProvider, useSession } from "@/lib/session";
import { colors } from "@/theme";

export default function RootLayout() {
  const [loaded, error] = useFonts({ Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold });

  // A calm blank page for the moment the fonts load (no spinner, no flash of other fonts).
  if (!loaded && !error) return <View style={{ flex: 1, backgroundColor: colors.page }} />;

  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </SessionProvider>
  );
}

/** Signed in: the app. Signed out: the sign-in screens. Expo Router moves between them as the session changes. */
function RootNavigator() {
  const { session, reload, signOut } = useSession();

  if (session.status === "loading") return <View style={{ flex: 1, backgroundColor: colors.page }} />;

  if (session.status === "unreachable") {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: "center", gap: 16 }}>
          <Title>We can’t reach Lanternway right now</Title>
          <Body>You’re still signed in. Check your connection and try again in a moment.</Body>
          <Button label="Try again" onPress={reload} />
          <Button label="Sign out" kind="secondary" onPress={signOut} />
        </View>
      </Screen>
    );
  }

  const signedIn = session.status === "signed-in";
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.page } }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
