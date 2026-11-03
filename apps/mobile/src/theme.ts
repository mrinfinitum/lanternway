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
  /** Cards and panels. */
  paper: "#FDF3E6",
  /** Page background, dialogs, boxes nested inside cards, inputs. */
  white: "#FFFFFF",
  /** Secondary text (≥ 5:1 on white, paper and cream). */
  muted: "#42636b",
  /** The one border color. */
  border: "#E9D3B4",
} as const;

/** Nunito weights, loaded in the root layout (src/app/_layout.tsx). */
export const fonts = {
  regular: "Nunito_400Regular",
  semibold: "Nunito_600SemiBold",
  bold: "Nunito_700Bold",
  extrabold: "Nunito_800ExtraBold",
} as const;

/** Generous rounding, as on the website's cards (rounded-2xl). */
export const radius = { card: 16, button: 12 } as const;

/** Smallest comfortable tap target, in points. */
export const minTap = 44;
