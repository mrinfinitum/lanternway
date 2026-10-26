import { cookies } from "next/headers";

/**
 * Short-lived cookie holding the email being verified (kept out of the URL).
 * Plain server module, not a server action, so the browser can't set it directly.
 */
export const VERIFY_COOKIE = "lw-verify";

export async function rememberEmailToVerify(email: string) {
  (await cookies()).set(VERIFY_COOKIE, email, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 30,
  });
}
