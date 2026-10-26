import { createNeonAuth } from "@neondatabase/auth/next/server";
import { connection } from "next/server";

/**
 * Neon Auth (Managed Better Auth). Users and sessions live in the `neon_auth`
 * schema of our Neon database. Server-only: used by the auth route, the proxy,
 * server actions, and server components.
 */
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
});

/** The signed-in user, or null. Reads cookies, so render inside <Suspense>. */
export async function getSignedInUser(): Promise<{ id: string; name: string; email: string } | null> {
  // Needs the incoming request: tell Next.js before the SDK reads cookies, so
  // prerendering pauses here cleanly instead of erroring inside the SDK.
  await connection();
  const { data } = await auth.getSession();
  const user = data?.user;
  return user ? { id: user.id, name: user.name ?? "", email: user.email } : null;
}
