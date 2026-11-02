"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSignedInUser } from "@/lib/auth/server";
import { CURRENT_CHILD_COOKIE, SAMPLE_FAMILY_COOKIE } from "@/lib/data";
import { forgetInvite, rememberInvite } from "@/lib/join-cookie";
import { acceptInvite, firstChildInNewestFamily, isInviteToken } from "@/lib/sharing";

export type JoinState = { error: string } | null;

/** Join the family as the signed-in person, then open the family's first child. */
export async function joinFamily(token: string): Promise<JoinState> {
  const user = await getSignedInUser();
  if (!user) {
    await rememberInvite(token);
    redirect("/sign-in");
  }
  const result = await acceptInvite(user.id, token);
  if (result === "used") return { error: "Someone has already used this invite. Ask for a new one." };
  if (result === "invalid") return { error: "This invite has expired or been turned off. Ask for a new one." };
  await forgetInvite();
  const store = await cookies();
  store.delete(SAMPLE_FAMILY_COOKIE);
  if (result === "joined") {
    const childId = await firstChildInNewestFamily(user.id);
    if (childId) store.set(CURRENT_CHILD_COOKIE, childId, { path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365 });
  }
  redirect("/home");
}

/** Not signed in yet: remember the invite and go to sign-up or sign-in. */
export async function signInToJoin(token: string, to: "sign-up" | "sign-in") {
  if (isInviteToken(token)) await rememberInvite(token);
  redirect(to === "sign-up" ? "/sign-up" : "/sign-in");
}
