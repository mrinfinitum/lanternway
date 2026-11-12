/**
 * Small building blocks for the phone screens, in the Lanternway style: a warm
 * wash behind the page, frosted paper cards with a soft warm shadow, cream for
 * things you tap, teal text and buttons, coral for problems. Every tap target is
 * at least 44 points.
 */
import type { ComponentRef, ReactNode, Ref } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Wash } from "@/components/warm";
import { useHeaderSpace } from "@/lib/header";
import { colors, fonts, minTap, radius, shadows } from "@/theme";

/** A scrolling page over the warm wash that keeps fields above the keyboard. Pass `header` under a (see-through) navigation bar. */
export function Screen({ children, header = false }: { children: ReactNode; header?: boolean }) {
  const headerSpace = useHeaderSpace(header);
  return (
    <View style={styles.page}>
      <Wash />
      <SafeAreaView style={styles.page} edges={header ? ["bottom"] : ["top", "bottom"]}>
        <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            contentContainerStyle={[styles.content, headerSpace.padding]}
            contentInsetAdjustmentBehavior={headerSpace.insetBehavior}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <Text style={styles.title} accessibilityRole="header">
      {children}
    </Text>
  );
}

export function Body({ children, center = true, muted = false }: { children: ReactNode; center?: boolean; muted?: boolean }) {
  return <Text style={[styles.body, !center && { textAlign: "left" }, muted && { color: colors.muted }]}>{children}</Text>;
}

/** A frosted paper card (the wash shows softly through it). */
export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

/** What `ref` on a Field points at (for moving focus to the next field). */
export type InputHandle = ComponentRef<typeof TextInput>;

type FieldProps = TextInputProps & { label: string; hint?: string; ref?: Ref<InputHandle> };

export function Field({ label, hint, style, ref, ...input }: FieldProps) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor={colors.muted}
        style={[styles.input, style]}
        {...input}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Button({ label, onPress, busy = false, busyLabel, kind = "primary" }: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  busyLabel?: string;
  kind?: "primary" | "secondary";
}) {
  const primary = kind === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: busy }}
      style={({ pressed }) => [
        styles.button,
        primary ? { backgroundColor: colors.teal } : { backgroundColor: colors.cream },
        (pressed || busy) && { opacity: 0.75 },
      ]}
    >
      <Text style={[styles.buttonText, { color: primary ? colors.white : colors.teal }]}>{busy ? (busyLabel ?? label) : label}</Text>
    </Pressable>
  );
}

/** A text link styled for tapping (teal, bold, a full-height tap area). */
export function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" hitSlop={8} style={styles.textLink}>
      <Text style={styles.textLinkText}>{label}</Text>
    </Pressable>
  );
}

/** A coral note for a problem, or an amber one for good news. Read out by screen readers. */
export function Notice({ text, tone = "problem" }: { text: string | null | undefined; tone?: "problem" | "info" }) {
  if (!text) return null;
  return (
    <View
      style={[styles.notice, { backgroundColor: tone === "problem" ? "rgba(244,130,91,0.15)" : "rgba(247,179,65,0.25)" }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.noticeText}>{text}</Text>
    </View>
  );
}

/** A checkbox row for agreements; the whole row is the tap target. */
export function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (next: boolean) => void; children: ReactNode }) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={styles.checkRow}
    >
      <View style={[styles.box, checked && { backgroundColor: colors.teal, borderColor: colors.teal }]}>
        {checked ? <Text style={styles.tick}>✓</Text> : null}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "transparent" },
  content: { padding: 24, gap: 16, flexGrow: 1 },
  title: { fontFamily: fonts.extrabold, fontSize: 26, lineHeight: 32, color: colors.teal, textAlign: "center" },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, color: colors.teal, textAlign: "center" },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.card,
    boxShadow: shadows.soft,
    padding: 20,
    gap: 16,
  },
  label: { fontFamily: fonts.bold, fontSize: 16, color: colors.teal },
  hint: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
  input: {
    minHeight: minTap + 4,
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.button,
    paddingHorizontal: 14,
    fontFamily: fonts.regular,
    fontSize: 17,
    color: colors.teal,
  },
  button: { minHeight: minTap + 4, borderRadius: 999, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  buttonText: { fontFamily: fonts.bold, fontSize: 17 },
  textLink: { minHeight: minTap, justifyContent: "center", alignItems: "center" },
  textLinkText: { fontFamily: fonts.bold, fontSize: 16, color: colors.teal, textDecorationLine: "underline" },
  notice: { borderRadius: radius.button, paddingHorizontal: 14, paddingVertical: 10 },
  noticeText: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, color: colors.teal },
  checkRow: { flexDirection: "row", gap: 12, alignItems: "flex-start", minHeight: minTap, paddingVertical: 4 },
  box: {
    width: 26,
    height: 26,
    marginTop: 1,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.teal,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  tick: { color: colors.white, fontFamily: fonts.extrabold, fontSize: 16, lineHeight: 18 },
  small: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.teal },
});
