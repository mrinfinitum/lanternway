/**
 * Refill reminders and the "ask for a refill" hand-off, shared by the website and the phone app.
 *
 * Lanternway never sends the message or places the call: these build `sms:` and `tel:`
 * links that open the parent's own Messages or Phone app. The note asks for a refill and
 * nothing else (no dose, symptoms, or advice).
 */

import { addDays } from "./dates";
import type { IsoDate } from "./types";

/** Days-before choices for a refill reminder. 0 means off. */
export const REFILL_REMINDER_DAYS = [3, 5, 7, 10] as const;
export const DEFAULT_REFILL_REMINDER_DAYS = 5;

/** The medication's setting, with the default filled in. 0 = off. */
export function refillReminderDays(setting?: number): number {
  return setting ?? DEFAULT_REFILL_REMINDER_DAYS;
}

/** The day the refill reminder arrives, or null when it's off or there's no due date. */
export function refillReminderDate(due: IsoDate | null, setting?: number): IsoDate | null {
  const days = refillReminderDays(setting);
  return due && days > 0 ? addDays(due, -days) : null;
}

/** The pre-written note, e.g. "Hi, this is Dana, Maya's parent. Could you please refill …?" */
export function refillNote({
  senderName,
  childName,
  medicationName,
  isParent,
}: {
  senderName?: string;
  childName: string;
  medicationName: string;
  isParent: boolean;
}): string {
  const first = senderName?.trim().split(/\s+/)[0];
  const role = isParent ? `${childName}'s parent` : `I help care for ${childName}`;
  const intro = first ? `Hi, this is ${first}, ${role}.` : isParent ? `Hi, I'm ${role}.` : `Hi, ${role}.`;
  return `${intro} Could you please refill ${childName}'s ${medicationName} prescription? Thank you.`;
}

/** Digits and a leading +, as phone links need. Empty when it doesn't look like a number. */
export function dialable(phone?: string): string {
  const cleaned = (phone ?? "").trim().replace(/(?!^\+)[^\d]/g, "");
  const digits = cleaned.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 ? cleaned : "";
}

export function telHref(phone: string): string {
  return `tel:${dialable(phone)}`;
}

/** A text-message link with the note filled in. iOS and Android separate the body differently. */
export function smsHref(phone: string, body: string, platform: "ios" | "android"): string {
  return `sms:${dialable(phone)}${platform === "ios" ? "&" : "?"}body=${encodeURIComponent(body)}`;
}
