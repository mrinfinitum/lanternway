import { redirect } from "next/navigation";
import { getSignedInUser } from "@/lib/auth/server";

/** If someone who is already signed in opens sign-in or sign-up, take them home. */
export async function RedirectIfSignedIn() {
  if (await getSignedInUser()) redirect("/home");
  return null;
}
