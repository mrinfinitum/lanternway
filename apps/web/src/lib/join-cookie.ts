import "server-only";
import { cookies } from "next/headers";
import { isInviteToken } from "@/lib/sharing";

/**
 * While someone signs in or signs up from a family invite, this short-lived cookie
 * remembers the invite (kept out of the URL), so they land back on /join afterwards.
 * Server-only. Cleared once they've joined.
 */
export const JOIN_COOKIE = "lw-join";

export async function rememberInvite(token: string) {
  (await cookies()).set(JOIN_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60,
  });
}

export async function forgetInvite() {
  (await cookies()).delete(JOIN_COOKIE);
}

/** Where to go after signing in: back to a pending invite, or Home. */
export async function afterSignInPath(): Promise<string> {
  const token = (await cookies()).get(JOIN_COOKIE)?.value ?? "";
  return isInviteToken(token) ? `/join/${token}` : "/home";
}
