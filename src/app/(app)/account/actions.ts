"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { deleteAccountData } from "@/lib/account";
import { auth, getSignedInUser } from "@/lib/auth/server";
import { CURRENT_CHILD_COOKIE, SAMPLE_FAMILY_COOKIE } from "@/lib/data";
import { passwordProblem } from "@/lib/password-policy";

export type FormState = { error?: string; done?: string } | null;

/** Sign out on every device, including this one. */
export async function signOutEverywhere() {
  await auth.revokeSessions();
  await auth.signOut();
  redirect("/sign-in");
}

export async function changePassword(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await getSignedInUser();
  if (!user) redirect("/sign-in");
  const currentPassword = String(form.get("currentPassword") ?? "");
  const newPassword = String(form.get("newPassword") ?? "");
  if (!currentPassword) return { error: "Please enter your current password." };
  const problem = passwordProblem(newPassword, user.email);
  if (problem) return { error: problem };
  const { error } = await auth.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
  if (error) {
    return { error: error.status === 401 || /invalid|password/i.test(error.code ?? "") ? "Your current password isn't right." : "We couldn't change your password. Please try again." };
  }
  return { done: "Password changed. Other devices have been signed out." };
}

/**
 * Delete the account: confirm the password and delete the sign-in account first (so a
 * wrong password changes nothing), then the family's data and consent records.
 */
export async function deleteAccount(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await getSignedInUser();
  if (!user) redirect("/sign-in");
  if (String(form.get("confirm") ?? "").trim().toUpperCase() !== "DELETE") return { error: "Please type DELETE to confirm." };
  const password = String(form.get("password") ?? "");
  if (!password) return { error: "Please enter your password." };

  // Re-check the password before deleting anything. (Neon's managed auth has no
  // self-service delete endpoint, so deletion happens in the database; see migration 004.)
  const { error } = await auth.signIn.email({ email: user.email, password });
  if (error) {
    return error.status === 429 ? { error: "Too many tries. Please wait a minute and try again." } : { error: "That password isn't right." };
  }

  try {
    await deleteAccountData(user.id);
  } catch {
    return { error: "We couldn't delete your account right now. Nothing was deleted. Please try again or contact us." };
  }
  const store = await cookies();
  store.delete(CURRENT_CHILD_COOKIE);
  store.delete(SAMPLE_FAMILY_COOKIE);
  await auth.signOut().catch(() => {});
  redirect("/?deleted=1");
}
