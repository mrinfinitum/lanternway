"use server";

import { refresh } from "next/cache";
import { getSignedInUser } from "@/lib/auth/server";
import { createCheckInLink, revokeCheckInLink, type NewLinkInput } from "@/lib/checkins";
import { recordConsents } from "@/lib/consents";

/**
 * Create a check-in link for one person about one of the family's own kids, and
 * record the parent's consent to ask them. Returns the token once; it's never stored.
 */
export async function createLink(input: NewLinkInput & { consent: boolean }): Promise<{ token?: string; error?: string }> {
  const user = await getSignedInUser();
  if (!user) return { error: "Please sign in again." };
  if (!input.consent) return { error: "Please confirm you'd like to ask this person for check-ins." };
  const result = await createCheckInLink(user.id, {
    childId: String(input.childId ?? ""),
    respondentId: input.respondentId ? String(input.respondentId) : undefined,
    respondent: input.respondent
      ? { name: String(input.respondent.name ?? ""), role: input.respondent.role, email: input.respondent.email ? String(input.respondent.email) : undefined }
      : undefined,
    days: Number(input.days),
  });
  if (typeof result === "string") return { error: result };
  await recordConsents(user.id, ["share_checkin"], { childId: input.childId, days: Number(input.days) });
  refresh();
  return { token: result.token };
}

export async function revokeLink(linkId: string): Promise<{ ok: boolean }> {
  const user = await getSignedInUser();
  if (!user) return { ok: false };
  const ok = await revokeCheckInLink(user.id, String(linkId));
  if (ok) refresh();
  return { ok };
}
