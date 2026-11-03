/**
 * Daily-log helpers for the phone: the order of the quick-log tiles, the gentle
 * "saved" messages (the website's wording), and one-line descriptions.
 */
import { appetiteLabels, moodLabels, ratingLabel } from "@lanternway/shared/labels";
import type { LogEntry, LogKind } from "@lanternway/shared/types";

export const logKindOrder: LogKind[] = ["mood", "sleep", "appetite", "meltdown", "win", "note"];

export const isLogKind = (value: unknown): value is LogKind => typeof value === "string" && (logKindOrder as string[]).includes(value);

/** A small symbol per tile (plain text, no icon library; U+FE0E keeps iOS from drawing a colour emoji). */
export const logKindSymbols: Record<LogKind, string> = {
  mood: "☺\uFE0E",
  sleep: "☾\uFE0E",
  appetite: "◍\uFE0E",
  meltdown: "≈",
  win: "★\uFE0E",
  note: "✎\uFE0E",
};

export const savedMessages: Record<LogKind, string> = {
  mood: "Mood saved.",
  sleep: "Sleep saved.",
  appetite: "Appetite saved.",
  meltdown: "Saved. Hard moments happen — thank you for noting it. It helps you see patterns over time.",
  win: "Win saved! Worth celebrating.",
  note: "Note saved.",
};

/** One line for the "Logged today" list. */
export function describeLog(log: LogEntry): string {
  switch (log.kind) {
    case "mood":
      return `Mood: ${ratingLabel(moodLabels, log.rating)}`;
    case "sleep":
      return `Sleep: ${log.hours} hrs, ${log.nightWakings} wake-up${log.nightWakings === 1 ? "" : "s"}`;
    case "appetite":
      return `Appetite: ${ratingLabel(appetiteLabels, log.rating).toLowerCase()}`;
    case "meltdown":
      return `Meltdown: ${log.trigger}, ${log.durationMinutes} min`;
    case "win":
      return `Win: ${log.text}`;
    case "note":
      return `Note: ${log.text}`;
  }
}

/** The phone's clock as HH:MM, for the log's time. */
export function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** "Today" on this phone (its own time zone), as YYYY-MM-DD. */
export function phoneToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
