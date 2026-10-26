"use server";

import { getSignedInUser } from "@/lib/auth/server";
import { sanitizeChild } from "@/lib/child-profile";
import { getToday } from "@/lib/data";
import { isSavedChildId, updateChild } from "@/lib/families";

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
