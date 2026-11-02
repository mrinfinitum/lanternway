import { authForRequest } from "@/lib/api/auth";
import { fail, json, publicRoute, readBody, str } from "@/lib/api/http";

/**
 * POST /api/v1/auth/verify-email { email, code } → { verified: true, token?, user? }.
 * When Neon Auth signs the person in on success, the token comes back too;
 * otherwise the app signs in with the password next.
 */
export const POST = publicRoute(async (request) => {
  const body = await readBody(request);
  const email = str(body?.email);
  const otp = str(body?.code).replace(/\D/g, "");
  if (!email) return fail(400, "Please enter your email address.");
  if (otp.length !== 6) return fail(400, "Please enter the 6-digit code from the email.");

  const { server, newToken } = authForRequest(request, null);
  const { data, error } = await server.emailOtp.verifyEmail({ email, otp });
  if (error) {
    const code = (error.code ?? "").toLowerCase();
    if (error.status === 429 || code.includes("too_many")) return fail(429, "Too many tries. Please request a new code.");
    if (code.includes("expired")) return fail(400, "That code has expired. Please request a new one.");
    return fail(400, "That code doesn't match. Please check the email and try again.");
  }
  const user = (data as { user?: { id: string; name?: string; email: string } } | null)?.user;
  const token = newToken();
  return json({ verified: true, ...(token && user ? { token, user: { id: user.id, name: user.name ?? "", email: user.email } } : {}) });
});
