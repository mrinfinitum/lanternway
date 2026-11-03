import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Platform } from "react-native";
import { Body, Button, Card, Field, Notice, Screen, TextLink, Title } from "@/components/ui";
import { resendCode, verifyEmail } from "@/lib/api";
import { useSession } from "@/lib/session";

export default function Verify() {
  const { email = "" } = useLocalSearchParams<{ email?: string }>();
  const { finishSignIn, signInAfterVerify } = useSession();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    const digits = code.replace(/\D/g, "");
    if (digits.length !== 6) return setError("Please enter the 6-digit code from the email.");
    setBusy(true);
    setError(null);
    setInfo(null);
    const result = await verifyEmail(email, digits);
    if (!result.ok) {
      setBusy(false);
      return setError(result.error);
    }
    // Signed in by the server, or sign in now with the password from a moment ago.
    const signedIn = result.data.token ? await finishSignIn(result.data.token) : await signInAfterVerify(email);
    setBusy(false);
    if (signedIn?.ok) return; // the layout switches to the app
    router.replace("/sign-in");
  }

  async function resend() {
    setError(null);
    const result = await resendCode(email);
    setInfo(result.ok ? "A new code is on its way." : null);
    if (!result.ok) setError(result.error);
  }

  return (
    <Screen header>
      <Title>Check your email</Title>
      <Body>We sent a 6-digit code to {email || "your email"}. Enter it below to confirm it’s you.</Body>
      <Card>
        <Field
          label="6-digit code"
          value={code}
          onChangeText={(text) => setCode(text.replace(/\D/g, "").slice(0, 6))}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete={Platform.OS === "ios" ? "one-time-code" : "sms-otp"}
          maxLength={6}
          returnKeyType="done"
          onSubmitEditing={submit}
        />
        <Notice text={error} />
        <Notice text={info} tone="info" />
        <Button label="Confirm" busyLabel="Checking…" busy={busy} onPress={submit} />
        <TextLink label="Send a new code" onPress={resend} />
      </Card>
      <Body muted>The code can take a minute to arrive. Check your spam folder if you don’t see it.</Body>
    </Screen>
  );
}
