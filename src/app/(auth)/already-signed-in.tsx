import { redirect } from "next/navigation";
import { getSignedInUser } from "@/lib/auth/server";
import { afterSignInPath } from "@/lib/join-cookie";

/** If someone who is already signed in opens sign-in or sign-up, take them home (or back to their invite). */
export async function RedirectIfSignedIn() {
  if (await getSignedInUser()) redirect(await afterSignInPath());
  return null;
}
