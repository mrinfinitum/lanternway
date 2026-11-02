"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { CURRENT_CHILD_COOKIE, SAMPLE_FAMILY_COOKIE, getChildren } from "@/lib/data";

const cookieOptions = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 365,
};

/** Switch which child the app shows. Only children in the current list are accepted. */
export async function selectChild(childId: string) {
  const kids = await getChildren();
  if (!kids.some((c) => c.id === childId)) return;
  (await cookies()).set(CURRENT_CHILD_COOKIE, childId, cookieOptions);
  refresh();
}

/** Look around the sample family (Maya and Theo). Your own family is untouched. */
export async function enterSampleFamily() {
  const store = await cookies();
  store.set(SAMPLE_FAMILY_COOKIE, "1", { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 });
  store.delete(CURRENT_CHILD_COOKIE);
  redirect("/home");
}

/** Back to your own family. */
export async function leaveSampleFamily() {
  const store = await cookies();
  store.delete(SAMPLE_FAMILY_COOKIE);
  store.delete(CURRENT_CHILD_COOKIE);
  redirect("/home");
}
