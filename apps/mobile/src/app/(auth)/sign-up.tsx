import { router } from "expo-router";
import * as Linking from "expo-linking";
import { useRef, useState } from "react";
import { Text, View } from "react-native";
import { SIGN_UP_CONSENTS, type SignUpConsentKey } from "@lanternway/shared/api";
import { PASSWORD_HINT, passwordProblem } from "@lanternway/shared/password-policy";
import { Body, Button, Card, Checkbox, Field, Notice, Screen, styles, TextLink, Title, type InputHandle } from "@/components/ui";
import { signUp, websiteUrl } from "@/lib/api";
import { useSession } from "@/lib/session";

const noConsents = Object.fromEntries(SIGN_UP_CONSENTS.map((c) => [c.key, false])) as Record<SignUpConsentKey, boolean>;

export default function SignUp() {
  const { rememberForVerify } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consents, setConsents] = useState(noConsents);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<InputHandle>(null);
  const passwordRef = useRef<InputHandle>(null);

  async function submit() {
    if (busy) return;
    const cleanEmail = email.trim();
    if (!name.trim()) return setError("Please add your first name.");
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) return setError("Please enter your email address.");
    const weak = passwordProblem(password, cleanEmail);
    if (weak) return setError(weak);
    if (!SIGN_UP_CONSENTS.every((c) => consents[c.key])) return setError("Please tick each box to continue.");
    setBusy(true);
    setError(null);
    const result = await signUp({ name: name.trim(), email: cleanEmail, password, consents });
    setBusy(false);
    if (!result.ok) return setError(result.error);
    rememberForVerify(cleanEmail, password);
    router.replace({ pathname: "/verify", params: { email: cleanEmail } });
  }

  return (
    <Screen header>
      <Title>Create your account</Title>
      <Body muted>A private place for your child’s records. It takes a minute.</Body>
      <Card>
        <Field
          label="Your first name"
          value={name}
          onChangeText={setName}
          autoComplete="given-name"
          textContentType="givenName"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
        />
        <Field
          ref={emailRef}
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
          hint={PASSWORD_HINT}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <View style={{ gap: 4 }} accessibilityLabel="Agreements">
          {SIGN_UP_CONSENTS.map((c) => (
            <Checkbox key={c.key} checked={consents[c.key]} onChange={(next) => setConsents((prev) => ({ ...prev, [c.key]: next }))}>
              <Text style={styles.small}>{c.text}</Text>
            </Checkbox>
          ))}
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", columnGap: 16 }}>
            {SIGN_UP_CONSENTS.flatMap((c) => c.links ?? []).map((link) => (
              <TextLink key={link.path} label={link.label} onPress={() => Linking.openURL(websiteUrl(link.path))} />
            ))}
          </View>
        </View>
        <Notice text={error} />
        <Button label="Create account" busyLabel="Creating your account…" busy={busy} onPress={submit} />
      </Card>
      <Body muted>Already have an account?</Body>
      <Button label="Sign in" kind="secondary" onPress={() => router.back()} />
    </Screen>
  );
}
