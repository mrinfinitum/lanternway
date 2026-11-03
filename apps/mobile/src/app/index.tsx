import { useCallback, useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { MeResponse } from "@lanternway/shared/api";
import { API_URL, getMe, type ApiResult } from "@/lib/api";
import { brandImages } from "@/lib/brand";
import { colors, fonts, minTap, radius } from "@/theme";

/**
 * Placeholder home (MOBILE_PLAN.md M3): the brand, plus a live check of the API.
 * Sign-in arrives in M4; until then the API answers "not signed in", which is expected.
 */
export default function Index() {
  const [result, setResult] = useState<ApiResult<MeResponse> | null>(null);

  useEffect(() => {
    let live = true;
    getMe().then((r) => live && setResult(r));
    return () => {
      live = false;
    };
  }, []);

  const check = useCallback(async () => {
    setResult(null);
    setResult(await getMe());
  }, []);

  const lumi = brandImages.lumiPeeking;
  const logo = brandImages.logoLockup;

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <Image source={logo.source} accessibilityLabel={logo.alt} style={{ width: 200, height: (200 * logo.height) / logo.width }} />
        <Image source={lumi.source} accessibilityLabel={lumi.alt} style={styles.lumi} resizeMode="contain" />

        <Text style={styles.title} accessibilityRole="header">
          Your child’s whole journey, in one place
        </Text>
        <Text style={styles.body}>The Lanternway app is on its way. Quick logging comes first.</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Connection</Text>
          <Text style={styles.body} accessibilityLiveRegion="polite">
            {statusText(result)}
          </Text>
          <Text style={styles.small}>{API_URL}</Text>
          <Pressable
            onPress={check}
            disabled={!result}
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, (pressed || !result) && { opacity: 0.7 }]}
          >
            <Text style={styles.buttonText}>Check again</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function statusText(result: ApiResult<MeResponse> | null): string {
  if (!result) return "Checking…";
  if (result.ok) {
    const kids = result.data.children.length;
    return `Signed in as ${result.data.user.name || result.data.user.email}. ${kids === 1 ? "1 child" : `${kids} children`} in your family.`;
  }
  if (result.status === 401) return "Connected to Lanternway. You’re not signed in yet; signing in is coming next.";
  return result.error;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  content: { padding: 24, alignItems: "center", gap: 16 },
  lumi: { width: 120, height: 213 },
  title: { fontFamily: fonts.extrabold, fontSize: 24, lineHeight: 30, color: colors.teal, textAlign: "center" },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, color: colors.teal, textAlign: "center" },
  small: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, textAlign: "center" },
  card: {
    alignSelf: "stretch",
    backgroundColor: colors.paper,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: 20,
    gap: 8,
    marginTop: 8,
  },
  cardTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.teal, textAlign: "center" },
  button: {
    minHeight: minTap,
    marginTop: 8,
    borderRadius: radius.button,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  buttonText: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
});
