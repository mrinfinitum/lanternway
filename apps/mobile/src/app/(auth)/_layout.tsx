import { Stack } from "expo-router";
import { colors, fonts } from "@/theme";

export const unstable_settings = { anchor: "sign-in" };

/** Sign-in, sign-up, email code and forgot password, with a plain back button. */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitle: "",
        headerShadowVisible: false,
        headerTintColor: colors.teal,
        headerBackButtonDisplayMode: "minimal",
        headerStyle: { backgroundColor: colors.white },
        headerTitleStyle: { fontFamily: fonts.bold },
        contentStyle: { backgroundColor: colors.white },
      }}
    >
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
    </Stack>
  );
}
