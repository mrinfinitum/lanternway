"use server";

import { getSignedInUser } from "@/lib/auth/server";
import { sanitizeChild } from "@/lib/child-profile";
import { getToday } from "@/lib/data";
import { recordConsents } from "@/lib/consents";
import { isSavedChildId, listChildren, updateChild } from "@/lib/families";

/**
 * Save an About Me edit for a child in the parent's own family. Sample-family
 * edits aren't saved (they last for the visit). Every field is re-checked here.
 */
export async function saveChildProfile(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const [user, today] = await Promise.all([getSignedInUser(), getToday()]);
  if (!user) return { ok: false, error: "Please sign in again." };
  const id = String((input as { id?: unknown })?.id ?? "");
  if (!isSavedChildId(id)) return { ok: false };

  const child = sanitizeChild(input, id, today);
  if (typeof child === "string") return { ok: false, error: child };
  const saved = await updateChild(user.id, child);
  return saved ? { ok: true } : { ok: false, error: "We couldn't save that change. Please try again." };
}

/**
 * Record the parent's consent to share specific sections of a child's About Me
 * (their own family's kids only). Separate from the sign-up consent, as state
 * health data laws require.
 */
export async function recordShareConsent(childId: string, sections: string[], audience: string | null): Promise<{ ok: boolean }> {
  const user = await getSignedInUser();
  if (!user || !isSavedChildId(childId)) return { ok: false };
  const mine = (await listChildren(user.id)).some((c) => c.id === childId);
  if (!mine) return { ok: false };
  const clean = sections.filter((s) => /^[a-zA-Z]{2,20}$/.test(s)).slice(0, 20);
  await recordConsents(user.id, ["share_profile"], { childId, sections: clean, audience });
  return { ok: true };
}
