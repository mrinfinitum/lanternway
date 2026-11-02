import { authForRequest } from "@/lib/api/auth";
import { fail, json, publicRoute, readBody, str } from "@/lib/api/http";

/**
 * POST /api/v1/auth/sign-in { email, password } → { token, user }.
 * The phone keeps the token in secure storage and sends it as `Authorization: Bearer <token>`.
 * An unverified email answers 403 { error: "needs_verification" }.
 */
export const POST = publicRoute(async (request) => {
  const body = await readBody(request);
  const email = str(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) return fail(400, "Please enter your email and password.");

  const { server, newToken } = authForRequest(request, null);
  const { data, error } = await server.signIn.email({ email, password });
  if (error) {
    // Neon Auth answers 422 `email_not_confirmed` for an unverified email.
    if (/not_confirmed|not_verified/i.test(error.code ?? "")) return fail(403, "needs_verification");
    if (error.status === 429) return fail(429, "Too many tries. Please wait a minute and try again.");
    return fail(401, "That email and password don't match.");
  }
  const token = newToken();
  if (!token || !data?.user) return fail(502, "Sign-in didn't finish. Please try again.");
  return json({ token, user: { id: data.user.id, name: data.user.name ?? "", email: data.user.email } });
});
