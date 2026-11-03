import { router, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Page, s as parts } from "@/components/screen-parts";
import { Button, Card } from "@/components/ui";
import { useSession } from "@/lib/session";
import { colors, fonts, minTap, radius } from "@/theme";

/** Only screens that are built natively are listed; the rest join as they're built (MOBILE_PLAN.md M6–M7). */
const screens: { href: Href; label: string; hint: string }[] = [
  { href: "/more/medications", label: "Medications", hint: "Current and past medications, dose history, refills, calendar" },
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
          <Pressable
            key={item.label}
            onPress={() => router.push(item.href)}
            accessibilityRole="button"
            accessibilityHint={item.hint}
            style={({ pressed }) => [st.row, pressed && { backgroundColor: "rgba(247,179,65,0.3)" }]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={st.label}>{item.label}</Text>
              <Text style={parts.rowMuted}>{item.hint}</Text>
            </View>
            <Text style={st.chev}>›</Text>
          </Pressable>
        ))}
      </View>

      <Card>
        <Text style={parts.cardTitle}>Account</Text>
        <Text style={parts.rowMuted}>Signed in as {user.email}</Text>
        <Button label="Sign out" kind="secondary" onPress={signOut} />
      </Card>
    </Page>
  );
}

const st = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: minTap + 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.card,
    backgroundColor: colors.cream,
  },
  label: { fontFamily: fonts.bold, fontSize: 17, color: colors.teal },
  chev: { fontFamily: fonts.bold, fontSize: 26, color: colors.teal },
});
