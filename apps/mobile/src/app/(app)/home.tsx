import { Image, Text, View } from "react-native";
import { Body, Button, Card, Screen, styles, Title } from "@/components/ui";
import { brandImages } from "@/lib/brand";
import { useSession } from "@/lib/session";
import { colors, fonts } from "@/theme";

/** Signed-in placeholder (M4): who you are and which children you can see. Quick log comes next (M5). */
export default function Home() {
  const { session, signOut } = useSession();
  if (session.status !== "signed-in") return null;
  const { user, children } = session.me;
  const lumi = brandImages.lumiPeeking;

  return (
    <Screen>
      <Image source={lumi.source} accessibilityLabel={lumi.alt} style={{ alignSelf: "center", width: 96, height: 171, marginTop: 16 }} resizeMode="contain" />
      <Title>Hi {user.name.split(" ")[0] || "there"}</Title>
      <Body muted>You’re signed in. Quick logging is the next thing coming to the app.</Body>
      <Card>
        <Text style={[styles.label, { textAlign: "center" }]}>{children.length ? "Your family" : "No children yet"}</Text>
        {children.length ? (
          children.map(({ child, role }) => (
            <View key={child.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 44 }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: colors.teal }}>{child.firstName}</Text>
              <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: colors.muted }}>{role === "admin" ? "Admin" : role === "log" ? "Can log" : "Can view"}</Text>
            </View>
          ))
        ) : (
          <Body muted>Add your first child on the Lanternway website for now. Adding a child in the app comes later.</Body>
        )}
      </Card>
      <Text style={[styles.small, { textAlign: "center", color: colors.muted }]}>Signed in as {user.email}</Text>
      <Button label="Sign out" kind="secondary" onPress={signOut} />
    </Screen>
  );
}
