import { createNeonAuth } from "@neondatabase/auth/next/server";
import { cookies } from "next/headers";
import { cache } from "react";

/**
 * Neon Auth (Managed Better Auth). Users and sessions live in the `neon_auth`
 * schema of our Neon database. Server-only: used by the auth route, the proxy,
 * server actions, and server components.
 */
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
});

/** The signed-in user, or null. Cached per request (header and page share one lookup). Reads cookies, so render inside <Suspense>. */
export const getSignedInUser = cache(async (): Promise<{ id: string; name: string; email: string } | null> => {
  // Read the request's cookies before the SDK does, so prerendering pauses here
  // cleanly (as request data) instead of erroring inside the SDK.
  await cookies();
  try {
    const { data } = await auth.getSession();
    const user = data?.user;
    return user ? { id: user.id, name: user.name ?? "", email: user.email } : null;
  } catch {
    // A stale or revoked session (e.g. after the account was deleted or signed out
    // elsewhere) can make the SDK try to clear its cookie, which isn't allowed while
    // rendering. Treat it as signed out; the proxy and next sign-in clean the cookie up.
    return null;
  }
});
