"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADDED_CHILD_COOKIE_PREFIX, MAX_ADDED_CHILDREN, buildChild } from "@/lib/added-children";
import { CURRENT_CHILD_COOKIE, getToday } from "@/lib/data";

const cookieOptions = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30,
};

/**
 * Save a child from the "Add a child" flow, switch to them, and open their About Me.
 * Returns a message if something needs fixing. Stage 2: insert into Supabase instead.
 */
export async function addChild(input: unknown): Promise<{ error: string } | void> {
  const [store, today] = await Promise.all([cookies(), getToday()]);
  const used = store.getAll().filter((c) => c.name.startsWith(ADDED_CHILD_COOKIE_PREFIX)).map((c) => c.name);
  if (used.length >= MAX_ADDED_CHILDREN) {
    return { error: `The prototype holds up to ${MAX_ADDED_CHILDREN} added kids. Sign-in and real saving come in the working version.` };
  }

  const id = `kid-${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
  const child = buildChild(input, id, today);
  if (typeof child === "string") return { error: child };

  const slot = Array.from({ length: MAX_ADDED_CHILDREN }, (_, i) => `${ADDED_CHILD_COOKIE_PREFIX}${i + 1}`).find((n) => !used.includes(n))!;
  store.set(slot, JSON.stringify(child), cookieOptions);
  store.set(CURRENT_CHILD_COOKIE, id, { ...cookieOptions, maxAge: 60 * 60 * 24 * 365 });
  redirect("/about-me?welcome=1");
}

/** Remove a child added with the flow (sample kids can't be removed). */
export async function removeAddedChild(childId: string): Promise<void> {
  const store = await cookies();
  for (const c of store.getAll()) {
    if (!c.name.startsWith(ADDED_CHILD_COOKIE_PREFIX)) continue;
    try {
      if ((JSON.parse(c.value) as { id?: string }).id === childId) store.delete(c.name);
    } catch {
      store.delete(c.name);
    }
  }
  if (store.get(CURRENT_CHILD_COOKIE)?.value === childId) store.delete(CURRENT_CHILD_COOKIE);
  redirect("/home");
}
