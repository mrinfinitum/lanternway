import { createAuthServer, NEON_AUTH_SESSION_COOKIE_NAME } from "@neondatabase/auth/server";

/**
 * Neon Auth for the mobile app's /api/v1 routes. Server-only.
 *
 * The phone has no cookies, so it sends the Neon Auth session token as
 * `Authorization: Bearer <token>`. Here that token is handed to the Neon Auth
 * server SDK as the session cookie it expects, and any cookie Neon Auth sets
 * (sign-in, email verification, password change) is caught so the route can
 * return the token in JSON instead.
 *
 * Only the session token is ever passed upstream, never the cached
 * `session_data` cookie, so every check asks Neon Auth: a revoked session
 * stops working right away. (MOBILE_PLAN.md §3; proven in the M0 spike.)
 */
export function authForRequest(request: Request, token: string | null = bearerToken(request)) {
  const setCookies = new Map<string, string>();
  const server = createAuthServer({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookieSecret: process.env.NEON_AUTH_COOKIE_SECRET!,
    context: () => ({
      getCookies: () => (token ? `${NEON_AUTH_SESSION_COOKIE_NAME}=${token}` : ""),
      setCookie: (name, value) => void setCookies.set(name, value),
      getHeader: (name) => request.headers.get(name),
      // Our own origin (already a trusted domain), never one the client chooses.
      getOrigin: () => new URL(request.url).origin,
      getFramework: () => "nextjs",
    }),
  });
  /** The session token Neon Auth set during this request (e.g. after sign-in), or null. */
  const newToken = () => setCookies.get(NEON_AUTH_SESSION_COOKIE_NAME) || null;
  return { server, newToken };
}

export function bearerToken(request: Request): string | null {
  const match = /^Bearer ([^\s;,]+)$/.exec(request.headers.get("authorization") ?? "");
  return match ? match[1] : null;
}

export type ApiUser = { id: string; name: string; email: string };

/** Neon Auth couldn't answer (rate limit or outage): not the same as signed out. */
export const AUTH_UNAVAILABLE = "auth_unavailable" as const;

/**
 * The signed-in user for a bearer-token request, null if the token isn't a live
 * session, or AUTH_UNAVAILABLE when Neon Auth is rate-limiting or down. Callers
 * must answer that with 503, not 401, so the app retries instead of signing out.
 */
export async function getBearerUser(request: Request): Promise<ApiUser | null | typeof AUTH_UNAVAILABLE> {
  if (!bearerToken(request)) return null;
  try {
    const { data, error } = await authForRequest(request).server.getSession({ query: { disableCookieCache: "true" } });
    if (error && (error.status === 429 || (error.status ?? 0) >= 500)) return AUTH_UNAVAILABLE;
    const user = data?.user;
    return user ? { id: user.id, name: user.name ?? "", email: user.email } : null;
  } catch {
    return AUTH_UNAVAILABLE;
  }
}
