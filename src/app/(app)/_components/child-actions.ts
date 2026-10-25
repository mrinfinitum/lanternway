"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { CURRENT_CHILD_COOKIE, getChildren } from "@/lib/data";

/** Switch which child the app shows. Only children in the family's own list are accepted. */
export async function selectChild(childId: string) {
  const kids = await getChildren();
  if (!kids.some((c) => c.id === childId)) return;

  (await cookies()).set(CURRENT_CHILD_COOKIE, childId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
  refresh();
}
