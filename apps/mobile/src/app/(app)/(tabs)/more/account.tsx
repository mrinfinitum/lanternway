import { useState } from "react";
import { Linking, Share, StyleSheet, Text, View } from "react-native";
import { PASSWORD_HINT, passwordProblem } from "@lanternway/shared/password-policy";
import { confirm, Page, s as parts } from "@/components/screen-parts";
import { Button, Card, Field, Notice, TextLink } from "@/components/ui";
import { changePassword, deleteAccount, exportAccount, saveToken, signOutEverywhere, websiteUrl } from "@/lib/api";
import { useSession } from "@/lib/session";
import { colors, fonts } from "@/theme";

const offlineNote = "You’re offline. Please try again once Lanternway is reachable.";

/** Account & privacy: password, sign out everywhere, a copy of your data, and deleting the account (the website's rules). */
export default function Account() {
  const { session, endHere } = useSession();
  if (session.status !== "signed-in") return null;
  const { user } = session.me;

  return (
    <Page edges={[]}>
      <Text style={parts.title} accessibilityRole="header">
        Account & privacy
      </Text>
      <Card>
        <Text style={parts.cardTitle}>Your account</Text>
        <View>
          <Text style={parts.rowMuted}>Name</Text>
          <Text style={parts.rowTitle}>{user.name || "—"}</Text>
        </View>
        <View>
          <Text style={parts.rowMuted}>Email</Text>
          <Text style={parts.rowTitle}>{user.email}</Text>
        </View>
      </Card>
      <ExportCard />
      <PasswordCard email={user.email} />
      <SignOutEverywhereCard onDone={() => endHere("You’ve been signed out on all devices.")} />
      <Card>
        <Text style={parts.cardTitle}>Policies</Text>
        <TextLink label="Privacy Policy" onPress={() => void Linking.openURL(websiteUrl("/privacy"))} />
        <TextLink label="Consumer Health Data Privacy Policy" onPress={() => void Linking.openURL(websiteUrl("/health-data-privacy"))} />
        <TextLink label="Terms of Use" onPress={() => void Linking.openURL(websiteUrl("/terms"))} />
      </Card>
      <DeleteCard onDeleted={() => endHere("Your account was deleted.")} />
    </Page>
  );
}

function ExportCard() {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  async function run() {
    setProblem(null);
    setBusy(true);
    const result = await exportAccount();
    setBusy(false);
    if (!result.ok) return setProblem(result.status === 0 ? offlineNote : result.error);
    // No file library yet: the share sheet can save the text (Save to Files) or send it to another app.
    await Share.share({ title: "Lanternway data", message: JSON.stringify(result.data, null, 2) }).catch(() => undefined);
  }
  return (
    <Card>
      <Text style={parts.cardTitle}>Your data</Text>
      <Text style={st.text}>
        A copy of everything Lanternway stores for your account: your family, your kids’ profiles, logs, medications, care team, school
        records, and your consent records. It opens in the share sheet, where you can save it to Files or send it to yourself.
      </Text>
      <Notice text={problem} />
      <Button label="Get a copy of my data" kind="secondary" busy={busy} busyLabel="Getting your data…" onPress={() => void run()} />
    </Card>
  );
}

function PasswordCard({ email }: { email: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  async function run() {
    setProblem(null);
    setDone(null);
    if (!current) return setProblem("Please enter your current password.");
    const weak = passwordProblem(next, email);
    if (weak) return setProblem(weak);
    setBusy(true);
    const result = await changePassword(current, next);
    setBusy(false);
    if (!result.ok) return setProblem(result.status === 0 ? offlineNote : result.error);
    // Other devices are signed out; this phone keeps going with its new session.
    if (result.data.token) await saveToken(result.data.token);
    setCurrent("");
    setNext("");
    setDone("Password changed. Other devices are signed out.");
  }
  return (
    <Card>
      <Text style={parts.cardTitle}>Change password</Text>
      <Field label="Current password" value={current} onChangeText={setCurrent} secureTextEntry autoComplete="current-password" textContentType="password" />
      <Field label="New password" value={next} onChangeText={setNext} secureTextEntry autoComplete="new-password" textContentType="newPassword" hint={PASSWORD_HINT} />
      <Notice text={problem} />
      <Notice text={done} tone="info" />
      <Button label="Change password" kind="secondary" busy={busy} busyLabel="Changing…" onPress={() => void run()} />
    </Card>
  );
}

function SignOutEverywhereCard({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  async function run() {
    if (!(await confirm("Sign out on all devices?", "Every phone and computer signed in to this account is signed out, this one too.", "Sign out all"))) return;
    setProblem(null);
    setBusy(true);
    const result = await signOutEverywhere();
    setBusy(false);
    if (!result.ok && result.status !== 401) return setProblem(result.status === 0 ? offlineNote : result.error);
    onDone();
  }
  return (
    <Card>
      <Text style={parts.cardTitle}>Signed in somewhere else?</Text>
      <Text style={st.text}>Lost a phone or used a shared computer? Sign out everywhere, including here.</Text>
      <Notice text={problem} />
      <Button label="Sign out on all devices" kind="secondary" busy={busy} busyLabel="Signing out…" onPress={() => void run()} />
    </Card>
  );
}

function DeleteCard({ onDeleted }: { onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function run() {
    setProblem(null);
    if (!password) return setProblem("Please enter your password.");
    if (typed.trim().toUpperCase() !== "DELETE") return setProblem("Please type DELETE to confirm.");
    setBusy(true);
    const result = await deleteAccount(password);
    setBusy(false);
    // A 409 means they're the only admin of a family others use (NEEDS_ANOTHER_ADMIN): nothing was deleted.
    if (!result.ok) return setProblem(result.status === 0 ? offlineNote : result.error);
    onDeleted();
  }

  return (
    <Card>
      <Text style={parts.cardTitle}>Delete your account</Text>
      {!open ? (
        <Button label="Delete my account…" kind="secondary" onPress={() => setOpen(true)} />
      ) : (
        <View style={st.danger}>
          <Text style={st.text}>
            This permanently deletes your account, your family’s children and their profiles, and your consent records. If someone else is
            also in your family, they keep access and only you are removed. It can’t be undone. You might want to get a copy of your data
            first.
          </Text>
          <Field label="Your password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" />
          <Field label="Type DELETE to confirm" value={typed} onChangeText={setTyped} autoCapitalize="characters" autoCorrect={false} />
          <Notice text={problem} />
          <Button label="Keep my account" kind="secondary" onPress={() => setOpen(false)} />
          <Button label="Delete my account" busy={busy} busyLabel="Deleting…" onPress={() => void run()} />
        </View>
      )}
    </Card>
  );
}

const st = StyleSheet.create({
  text: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.teal },
  danger: { gap: 12, backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: "rgba(244,130,91,0.5)", padding: 12 },
});
