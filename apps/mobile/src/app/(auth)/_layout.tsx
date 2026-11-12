import { Stack } from "expo-router";
import { stackHeader } from "@/lib/header";

export const unstable_settings = { anchor: "sign-in" };

/** Sign-in, sign-up, email code and forgot password, with a plain back button over the warm wash. */
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ ...stackHeader, headerTitle: "" }}>
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
    </Stack>
  );
}
