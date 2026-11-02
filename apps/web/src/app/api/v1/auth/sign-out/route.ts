import { AUTH_UNAVAILABLE, authForRequest, getBearerUser } from "@/lib/api/auth";
import { fail, json, publicRoute, SIGN_IN_AGAIN, unavailable } from "@/lib/api/http";

/** POST /api/v1/auth/sign-out → ends this device's session (other devices stay signed in). */
export const POST = publicRoute(async (request) => {
  const user = await getBearerUser(request);
  if (user === AUTH_UNAVAILABLE) return unavailable();
  if (!user) return fail(401, SIGN_IN_AGAIN);
  await authForRequest(request).server.signOut();
  return json({ ok: true });
});
