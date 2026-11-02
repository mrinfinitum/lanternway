"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { getSignedInUser } from "@/lib/auth/server";
import { recordConsents } from "@/lib/consents";
import { CURRENT_CHILD_COOKIE } from "@/lib/data";
import { changeMemberRole, createInvite, removeMember, revokeInvite, type FamilyRole } from "@/lib/sharing";

/**
 * Create an invite link and record the admin's consent to share the family's
 * records with that person. Returns the token once; only its hash is stored.
 */
export async function inviteToFamily(input: {
  familyId: string;
  label: string;
  role: FamilyRole;
  days: number;
  consent: boolean;
}): Promise<{ token?: string; error?: string }> {
  const user = await getSignedInUser();
  if (!user) return { error: "Please sign in again." };
  if (!input.consent) return { error: "Please confirm you'd like to share your family's records with this person." };
  const result = await createInvite(user.id, {
    familyId: String(input.familyId),
    label: String(input.label ?? ""),
    role: input.role,
    days: Number(input.days),
  });
  if (typeof result === "string") return { error: result };
  await recordConsents(user.id, ["share_family"], { familyId: input.familyId, role: input.role, days: Number(input.days) });
  refresh();
  return { token: result.token };
}

export async function cancelInvite(inviteId: string): Promise<{ ok: boolean }> {
  const user = await getSignedInUser();
  if (!user) return { ok: false };
  const ok = await revokeInvite(user.id, String(inviteId));
  if (ok) refresh();
  return { ok };
}

export async function setMemberRole(familyId: string, memberId: string, role: FamilyRole): Promise<{ error?: string }> {
  const user = await getSignedInUser();
  if (!user) return { error: "Please sign in again." };
  const error = await changeMemberRole(user.id, String(familyId), String(memberId), role);
  refresh();
  return error ? { error } : {};
}

/** Remove someone (admins), or leave the family yourself. */
export async function removeFromFamily(familyId: string, memberId: string): Promise<{ error?: string }> {
  const user = await getSignedInUser();
  if (!user) return { error: "Please sign in again." };
  const error = await removeMember(user.id, String(familyId), String(memberId));
  if (error) return { error };
  // Leaving: stop pointing at a child you can no longer see.
  if (memberId === user.id) (await cookies()).delete(CURRENT_CHILD_COOKIE);
  refresh();
  return {};
}
