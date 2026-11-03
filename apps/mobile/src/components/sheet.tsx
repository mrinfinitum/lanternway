/**
 * A native page sheet (swipe down or tap Done to close) with a scrolling body that
 * stays above the keyboard. Used for "Ask for a refill", check-in links and invites.
 */
import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { s as parts } from "@/components/screen-parts";
import { colors, fonts, minTap } from "@/theme";

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }} edges={["bottom"]}>
        <View style={st.top}>
          <Text style={[parts.cardTitle, { flex: 1 }]} accessibilityRole="header">
            {title}
          </Text>
          <Pressable onPress={onClose} accessibilityRole="button" style={st.done} hitSlop={8}>
            <Text style={st.doneText}>Done</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={st.body} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          {children}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const st = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  done: { minHeight: minTap, justifyContent: "center", paddingHorizontal: 4 },
  doneText: { fontFamily: fonts.bold, fontSize: 17, color: colors.teal },
  body: { paddingHorizontal: 20, paddingBottom: 24, gap: 14 },
});
