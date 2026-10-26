"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSignedInUser } from "@/lib/auth/server";
import { MAX_CHILDREN, buildChild } from "@/lib/child-profile";
import { CURRENT_CHILD_COOKIE, SAMPLE_FAMILY_COOKIE, getToday } from "@/lib/data";
import { deleteChild, insertChild, listChildren } from "@/lib/families";

const cookieOptions = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 365,
};

/**
 * Save a child from the "Add a child" flow to the signed-in parent's family,
 * switch to them, and open their About Me. Returns a message if something needs fixing.
 */
export async function addChild(input: unknown): Promise<{ error: string } | void> {
  const [user, today, store] = await Promise.all([getSignedInUser(), getToday(), cookies()]);
  if (!user) redirect("/sign-in");

  const child = buildChild(input, "new", today);
  if (typeof child === "string") return { error: child };
  if ((await listChildren(user.id)).length >= MAX_CHILDREN) {
    return { error: `A family can have up to ${MAX_CHILDREN} kids in this prototype.` };
  }

  const { id: _placeholder, ...profile } = child;
  void _placeholder;
  const id = await insertChild(user.id, profile);

  store.set(CURRENT_CHILD_COOKIE, id, cookieOptions);
  store.delete(SAMPLE_FAMILY_COOKIE); // adding a real child brings you back to your own family
  redirect("/about-me?welcome=1");
}

/** Remove a child from the family (admins only, enforced by row-level security). */
export async function removeChild(childId: string): Promise<void> {
  const [user, store] = await Promise.all([getSignedInUser(), cookies()]);
  if (!user) redirect("/sign-in");
  await deleteChild(user.id, childId);
  if (store.get(CURRENT_CHILD_COOKIE)?.value === childId) store.delete(CURRENT_CHILD_COOKIE);
  redirect("/home");
}
