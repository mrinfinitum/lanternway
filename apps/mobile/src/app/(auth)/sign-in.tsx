import { router } from "expo-router";
import { useRef, useState } from "react";
import { Image } from "react-native";
import { Body, Button, Card, Field, Notice, Screen, TextLink, Title, type InputHandle } from "@/components/ui";
import { resendCode } from "@/lib/api";
import { brandImages } from "@/lib/brand";
import { useSession } from "@/lib/session";

export default function SignIn() {
  const { session, signIn } = useSession();
  const notice = session.status === "signed-out" ? session.notice : undefined;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<InputHandle>(null);

  async function submit() {
    if (busy) return;
    if (!email.trim() || !password) return setError("Please enter your email and password.");
    setBusy(true);
    setError(null);
    const result = await signIn(email.trim(), password);
    setBusy(false);
    if (result.ok) return; // the layout switches to the app
    if (result.needsVerification) {
      void resendCode(email.trim());
      router.push({ pathname: "/verify", params: { email: email.trim() } });
      return;
    }
    setError(result.error);
  }

  const logo = brandImages.logoLockup;
  return (
    <Screen>
      <Image
        source={logo.source}
        accessibilityLabel={logo.alt}
        style={{ alignSelf: "center", width: 180, height: (180 * logo.height) / logo.width, marginTop: 24 }}
      />
      <Title>Welcome back</Title>
      <Body muted>Sign in to keep your child’s records in one place.</Body>
      {!error && <Notice text={notice} tone="info" />}
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
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <Field
          ref={passwordRef}
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <Notice text={error} />
        <Button label="Sign in" busyLabel="Signing in…" busy={busy} onPress={submit} />
        <TextLink label="Forgot your password?" onPress={() => router.push({ pathname: "/forgot-password", params: { email: email.trim() } })} />
      </Card>
      <Body muted>New to Lanternway?</Body>
      <Button label="Create an account" kind="secondary" onPress={() => router.push("/sign-up")} />
    </Screen>
  );
}
