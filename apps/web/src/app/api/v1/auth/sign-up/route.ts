import { authForRequest } from "@/lib/api/auth";
import { fail, json, publicRoute, readBody, str } from "@/lib/api/http";
import { recordConsents } from "@/lib/consents";
import { passwordProblem } from "@lanternway/shared/password-policy";

const isEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v);

/** The same four boxes as the web sign-up, each one required. */
const CONSENTS = [
  ["adult", "confirm you're 18 or older and a parent or guardian"],
  ["terms", "agree to the Terms of Use and Privacy Policy"],
  ["healthData", "consent to Lanternway storing the health information you enter"],
  ["testing", "confirm you'll use made-up details while we're testing"],
] as const;

/**
 * POST /api/v1/auth/sign-up { name, email, password, consents: { adult, terms, healthData, testing } }
 * → { status: "needs_verification" }. A 6-digit code is emailed; then POST /auth/verify-email.
 */
export const POST = publicRoute(async (request) => {
  const body = await readBody(request);
  const name = str(body?.name);
  const email = str(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!name) return fail(400, "Please add your first name.");
  if (!isEmail(email)) return fail(400, "Please enter your email address.");
  const weak = passwordProblem(password, email);
  if (weak) return fail(400, weak);
  const consents = (body?.consents ?? {}) as Record<string, unknown>;
  const missing = CONSENTS.find(([key]) => consents[key] !== true);
  if (missing) return fail(400, `Please tick the box to ${missing[1]}.`);

  const { data, error } = await authForRequest(request, null).server.signUp.email({ name, email, password });
  if (error) {
    if (error.status === 429) return fail(429, "Too many tries. Please wait a minute and try again.");
    // Stay neutral rather than confirming whether an account exists.
    return fail(400, "We couldn't create an account with that email. If you already have one, try signing in.");
  }
  const userId = (data as { user?: { id?: string } } | null)?.user?.id;
  if (userId) await recordConsents(userId, ["adult_guardian", "terms", "privacy", "health_data_collection", "test_data"], { via: "mobile" });
  return json({ status: "needs_verification" });
});
