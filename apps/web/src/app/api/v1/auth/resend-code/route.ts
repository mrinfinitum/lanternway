import { authForRequest } from "@/lib/api/auth";
import { fail, json, publicRoute, readBody, str } from "@/lib/api/http";

/** POST /api/v1/auth/resend-code { email } → { ok: true } (the same answer whether or not the account exists). */
export const POST = publicRoute(async (request) => {
  const email = str((await readBody(request))?.email);
  if (!email) return fail(400, "Please enter your email address.");
  const { error } = await authForRequest(request, null).server.emailOtp.sendVerificationOtp({ email, type: "email-verification" });
  if (error?.status === 429) return fail(429, "Please wait a minute before asking for another code.");
  return json({ ok: true });
});
