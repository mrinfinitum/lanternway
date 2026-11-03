import { router, type Href } from "expo-router";
import { Text, View } from "react-native";
import { NavRow, Page, s as parts } from "@/components/screen-parts";
import { Button, Card } from "@/components/ui";
import { useSession } from "@/lib/session";

/** Every native screen beyond the tabs. No web pages inside the app (MOBILE_PLAN.md §0). */
const screens: { href: Href; label: string; hint: string }[] = [
  { href: "/more/medications", label: "Medications", hint: "Current and past medications, dose history, refills, calendar" },
  { href: "/more/therapy", label: "Therapy & care team", hint: "Providers, goals, session notes, calendar" },
  { href: "/more/school", label: "School", hint: "IEP or 504 plan, goals, supports, check-ins, messages" },
  { href: "/more/about-me", label: "About Me", hint: "Everything someone new should know" },
];

const accountScreens: { href: Href; label: string; hint: string }[] = [
  { href: "/more/family", label: "Family sharing", hint: "Who can see your family’s records, and invites" },
  { href: "/more/account", label: "Account & privacy", hint: "Password, your data, deleting your account" },
];

export default function More() {
  const { session, signOut } = useSession();
  if (session.status !== "signed-in") return null;
  const { user } = session.me;

  return (
    <Page>
      <Text style={parts.title} accessibilityRole="header">
        More
      </Text>
      <View style={{ gap: 10 }}>
        {screens.map((item) => (
          <NavRow key={item.label} label={item.label} hint={item.hint} onPress={() => router.push(item.href)} />
        ))}
      </View>

      <Text style={parts.section} accessibilityRole="header">
        Account
      </Text>
      <View style={{ gap: 10 }}>
        {accountScreens.map((item) => (
          <NavRow key={item.label} label={item.label} hint={item.hint} onPress={() => router.push(item.href)} />
        ))}
      </View>
      <Card>
        <Text style={parts.rowMuted}>Signed in as {user.email}</Text>
        <Button label="Sign out" kind="secondary" onPress={signOut} />
      </Card>
    </Page>
  );
}
