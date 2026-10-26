"use server";

import { isSavedLinkToken, submitSavedCheckIn } from "@/lib/checkins";
import { todayIn } from "@/lib/dates";
import type { CheckInRatings, IsoDate } from "@/lib/types";

const rating = (v: unknown) => (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 5 ? (v as CheckInRatings["focus"]) : null);

/**
 * Save a check-in from the public form. The token is the only credential: the
 * database checks it (hash, expiry, revoke) and saves to that one child.
 * Sample-family links are a preview, so nothing is saved for them.
 */
export async function sendCheckIn(token: string, date: string, ratings: Partial<Record<keyof CheckInRatings, unknown>>, note: string): Promise<{ ok: boolean }> {
  const r = { focus: rating(ratings.focus), mood: rating(ratings.mood), behavior: rating(ratings.behavior), participation: rating(ratings.participation) };
  if (!r.focus || !r.mood || !r.behavior || !r.participation) return { ok: false };
  if (!isSavedLinkToken(String(token))) return { ok: true }; // sample preview

  // The respondent's own "today", within a day of the server's (time zones).
  const utc = todayIn("UTC");
  const day = /^\d{4}-\d{2}-\d{2}$/.test(date) ? (date as IsoDate) : utc;
  const near = Math.abs(Date.parse(day) - Date.parse(utc)) <= 86_400_000;
  const ok = await submitSavedCheckIn(String(token), near ? day : utc, r as CheckInRatings, String(note ?? ""));
  return { ok };
}
