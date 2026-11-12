/**
 * Lanternway brand tokens for the phone app: the same colors and surfaces as the
 * website (CLAUDE.md "Brand tokens"), and Nunito. Use these instead of raw hex.
 */
export const colors = {
  /** Lumi, heart, highlights, positive progress. */
  amber: "#F7B341",
  /** Accents, sparkles, celebrations; missed/alert markers. */
  coral: "#F4825B",
  /** Text, outlines, primary buttons, headers, selected state. */
  teal: "#034251",
  /** Tappable fills: quick-log tiles, option cards, chips. */
  cream: "#F7E7CD",
  /** Paper, solid (sheets and anything that can't be translucent). */
  paper: "#FDF3E6",
  /** Cards and panels: frosted paper over the warm wash (no real blur; the wash shows through). */
  card: "rgba(255,249,241,0.82)",
  /** Dialogs, boxes nested inside cards, inputs. */
  white: "#FFFFFF",
  /** Warm white under the background wash. */
  page: "#FFFAF4",
  /** Decoration only (the wash, gradient tiles, hero cards). Never text. */
  peach: "#FFD8BD",
  butter: "#FFE8A3",
  /** Secondary text (≥ 5:1 on white, paper and cream). */
  muted: "#42636b",
  /** The one border color. */
  border: "#F1DCC0",
} as const;

/** Nunito weights, loaded in the root layout (src/app/_layout.tsx). */
export const fonts = {
  regular: "Nunito_400Regular",
  semibold: "Nunito_600SemiBold",
  bold: "Nunito_700Bold",
  extrabold: "Nunito_800ExtraBold",
} as const;

/** Generous rounding, as on the website: cards, the one hero card per screen, buttons and inner boxes. */
export const radius = { card: 22, hero: 28, button: 14 } as const;

/**
 * Warm shadows, the website's shadow-soft and shadow-lift (coral-tinted, soft, never hard and dark).
 * React Native draws `boxShadow` on iOS and Android alike.
 */
export const shadows = {
  soft: "0px 12px 32px -16px rgba(244,130,91,0.35), 0px 2px 8px -4px rgba(3,66,81,0.08)",
  lift: "0px 18px 40px -18px rgba(244,130,91,0.45), 0px 4px 12px -6px rgba(3,66,81,0.1)",
} as const;

/** Smallest comfortable tap target, in points. */
export const minTap = 44;
