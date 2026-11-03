import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Body, Button, Card, Field, Notice, Screen, Title } from "@/components/ui";
import { forgotPassword } from "@/lib/api";

/**
 * Asks for a reset link. The person sets the new password on the website's
 * /reset-password page from the email, then signs in here.
 */
export default function ForgotPassword() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? "");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Please enter your email address.");
    setBusy(true);
    setError(null);
    const result = await forgotPassword(email.trim());
    setBusy(false);
    if (!result.ok) return setError(result.error);
    setSent(true);
  }

  if (sent) {
    return (
      <Screen header>
        <Title>Check your email</Title>
        <Body>
          If there’s a Lanternway account for {email.trim()}, we’ve sent a link to reset your password. Open it on this phone or a
          computer, choose a new password, then come back here to sign in.
        </Body>
        <Button label="Back to sign in" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen header>
      <Title>Forgot your password?</Title>
      <Body muted>Enter your email and we’ll send you a link to choose a new one.</Body>
      <Card>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          autoCorrect={false}
          spellCheck={false}
          textContentType="username"
          returnKeyType="send"
          onSubmitEditing={submit}
        />
        <Notice text={error} />
        <Button label="Send the link" busyLabel="Sending…" busy={busy} onPress={submit} />
      </Card>
    </Screen>
  );
}
