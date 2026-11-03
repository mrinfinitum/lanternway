/**
 * One-thumb controls for the quick-log forms: a 1–5 rating row, chips, and a
 * stepper. Cream means "tap this"; teal means selected.
 */
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Rating } from "@lanternway/shared/types";
import { colors, fonts, minTap, radius } from "@/theme";

export function Legend({ children }: { children: string }) {
  return <Text style={styles.legend}>{children}</Text>;
}

export function RatingPicker({ label, labels, value, onChange }: {
  label: string;
  labels: readonly string[];
  value: Rating | null;
  onChange: (rating: Rating) => void;
}) {
  return (
    <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Legend>{label}</Legend>
      <View style={styles.ratingRow}>
        {labels.map((text, i) => {
          const rating = (i + 1) as Rating;
          const selected = value === rating;
          return (
            <Pressable
              key={text}
              onPress={() => onChange(rating)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${rating}, ${text}`}
              style={[styles.ratingTile, selected && styles.selected]}
            >
              <Text style={[styles.ratingNumber, selected && styles.selectedText]}>{rating}</Text>
              <Text style={[styles.ratingText, selected && styles.selectedText]}>{text}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Chips({ label, options, selected, onToggle }: {
  label: string;
  options: readonly string[];
  selected: string[];
  onToggle: (option: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <View style={{ gap: 8 }} accessibilityLabel={label}>
      <Legend>{label}</Legend>
      <View style={styles.chipWrap}>
        {options.map((option) => {
          const on = selected.includes(option);
          return (
            <Pressable
              key={option}
              onPress={() => onToggle(option)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              style={[styles.chip, on && styles.selected]}
            >
              <Text style={[styles.chipText, on && styles.selectedText]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Stepper({ label, value, step, min, max, unit, onChange }: {
  label: string;
  value: number;
  step: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  const shown = `${value}${unit ? ` ${unit}` : ""}`;
  return (
    <View style={{ gap: 8 }}>
      <Legend>{label}</Legend>
      <View style={styles.stepperRow} accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ text: shown }}>
        <Pressable
          onPress={() => onChange(Math.max(min, value - step))}
          accessibilityRole="button"
          accessibilityLabel={`Less ${label.toLowerCase()}`}
          style={styles.stepButton}
        >
          <Text style={styles.stepSign}>−</Text>
        </Pressable>
        <Text style={styles.stepValue}>{shown}</Text>
        <Pressable
          onPress={() => onChange(Math.min(max, value + step))}
          accessibilityRole="button"
          accessibilityLabel={`More ${label.toLowerCase()}`}
          style={styles.stepButton}
        >
          <Text style={styles.stepSign}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { fontFamily: fonts.bold, fontSize: 16, color: colors.teal },
  ratingRow: { flexDirection: "row", gap: 6 },
  ratingTile: {
    flex: 1,
    minHeight: 72,
    borderRadius: radius.button,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
    gap: 2,
  },
  ratingNumber: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.teal },
  ratingText: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 13, color: colors.teal, textAlign: "center" },
  selected: { backgroundColor: colors.teal, borderColor: colors.teal },
  selectedText: { color: colors.white },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minHeight: minTap,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.cream,
    justifyContent: "center",
  },
  chipText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.teal },
  stepperRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  stepButton: {
    width: minTap + 4,
    height: minTap + 4,
    borderRadius: 999,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  stepSign: { fontFamily: fonts.bold, fontSize: 24, color: colors.teal },
  stepValue: { fontFamily: fonts.bold, fontSize: 20, color: colors.teal, minWidth: 80, textAlign: "center" },
});
