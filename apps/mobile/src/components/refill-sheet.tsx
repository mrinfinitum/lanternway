/**
 * "Ask for a refill": a note the parent can change, with Text and Call buttons for
 * the pharmacy and prescriber. These open the phone's own Messages or Phone app;
 * Lanternway never sends anything. When the phone can't text or call (an iPad, a
 * simulator), Share hands the note to any app, including Copy.
 */
import { useState } from "react";
import { Linking, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { FamilyRole } from "@lanternway/shared/family-roles";
import { dialable, refillNote, smsHref, telHref } from "@lanternway/shared/refills";
import type { Medication } from "@lanternway/shared/types";
import { s as parts } from "@/components/screen-parts";
import { Button, Field, Notice } from "@/components/ui";
import { colors, fonts, minTap, radius } from "@/theme";

type Contact = { label: string; name?: string; phone: string };

export function RefillSheet({ med, childName, senderName, role, prescriber, onClose }: {
  med: Medication;
  childName: string;
  senderName?: string;
  role: FamilyRole;
  prescriber?: { name: string; phone?: string };
  onClose: () => void;
}) {
  const [note, setNote] = useState(() => refillNote({ senderName, childName, medicationName: med.name, isParent: role === "admin" }));
  const [problem, setProblem] = useState<string | null>(null);

  const contacts: Contact[] = [
    { label: "Pharmacy", name: med.pharmacy, phone: dialable(med.pharmacyPhone) ? med.pharmacyPhone! : "" },
    { label: "Prescriber", name: prescriber?.name, phone: dialable(prescriber?.phone) ? prescriber!.phone! : "" },
  ].filter((c) => c.phone);

  async function open(url: string, what: "text" | "call") {
    setProblem(null);
    try {
      if (await Linking.canOpenURL(url)) return await Linking.openURL(url);
    } catch {
      // Fall through to the note below.
    }
    setProblem(
      what === "text"
        ? "This device can’t send texts. You can share or copy the note instead."
        : "This device can’t make calls. You can share or copy the note instead.",
    );
  }

  async function share() {
    setProblem(null);
    try {
      await Share.share({ message: note });
    } catch {
      setProblem("Sharing didn’t open. You can press and hold the note to copy it.");
    }
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }} edges={["bottom"]}>
        <View style={st.top}>
          <Text style={[parts.cardTitle, { flex: 1 }]} accessibilityRole="header">
            Ask for a refill of {med.name}
          </Text>
          <Pressable onPress={onClose} accessibilityRole="button" style={st.done} hitSlop={8}>
            <Text style={st.doneText}>Done</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={st.body} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          <Text style={parts.rowMuted}>Text or call from your own phone. You can change the note first. Lanternway doesn’t send anything.</Text>
          <Field label="Note" value={note} onChangeText={setNote} multiline style={{ minHeight: 120, paddingTop: 12 }} />

          {contacts.length === 0 ? (
            <View style={st.contact}>
              <Text style={parts.rowMuted}>
                {role === "view"
                  ? "No phone number is saved for the pharmacy or prescriber yet. You can share or copy the note and send it yourself."
                  : "No phone number is saved for the pharmacy or prescriber yet. You can add them on the Lanternway website. For now, share or copy the note and send it yourself."}
              </Text>
            </View>
          ) : (
            contacts.map((c) => (
              <View key={c.label} style={st.contact}>
                <Text style={parts.rowTitle}>
                  {c.label}
                  {c.name ? <Text style={{ fontFamily: fonts.regular }}> · {c.name}</Text> : null}
                </Text>
                <Text style={parts.rowMuted}>{c.phone}</Text>
                <View style={st.actions}>
                  <View style={{ flex: 1 }}>
                    <Button label="Text" onPress={() => open(smsHref(c.phone, note, Platform.OS === "ios" ? "ios" : "android"), "text")} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button label="Call" kind="secondary" onPress={() => open(telHref(c.phone), "call")} />
                  </View>
                </View>
              </View>
            ))
          )}

          <Notice text={problem} tone="info" />
          <Button label="Share or copy the note" kind="secondary" onPress={share} />
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
  contact: { backgroundColor: colors.paper, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card, padding: 14, gap: 4 },
  actions: { flexDirection: "row", gap: 10, marginTop: 8 },
});
