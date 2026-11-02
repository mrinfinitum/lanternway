import { authForRequest } from "@/lib/api/auth";
import { fail, json, publicRoute, readBody, str } from "@/lib/api/http";

/**
 * POST /api/v1/auth/forgot-password { email } → { ok: true }.
 * Emails the same reset link as the website; the person sets a new password on the
 * website's /reset-password page, then signs in on the phone. Always answers the
 * same way, so it can't be used to find out who has an account.
 */
export const POST = publicRoute(async (request) => {
  const email = str((await readBody(request))?.email);
  if (!/^\S+@\S+\.\S+$/.test(email)) return fail(400, "Please enter your email address.");
  const redirectTo = `${new URL(request.url).origin}/reset-password`;
  const { error } = await authForRequest(request, null).server.requestPasswordReset({ email, redirectTo });
  if (error?.status === 429) return fail(429, "Too many tries. Please wait a minute and try again.");
  return json({ ok: true });
});
