import { authForRequest } from "@/lib/api/auth";
import { fail, json, readBody, str, withUser } from "@/lib/api/http";
import { deleteAccountData, NEEDS_ANOTHER_ADMIN } from "@/lib/account";

/**
 * POST /api/v1/account/delete { password, confirm: "DELETE" } → { ok: true }.
 * Same rules as the website: the password is checked first, so a wrong one changes
 * nothing; the only admin of a shared family has to hand off first.
 */
export const POST = withUser(async (request, user) => {
  const body = await readBody(request);
  if (str(body?.confirm).toUpperCase() !== "DELETE") return fail(400, "Please type DELETE to confirm.");
  const password = typeof body?.password === "string" ? body.password : "";
  if (!password) return fail(400, "Please enter your password.");

  const { error } = await authForRequest(request, null).server.signIn.email({ email: user.email, password });
  if (error) return error.status === 429 ? fail(429, "Too many tries. Please wait a minute and try again.") : fail(400, "That password isn't right.");

  try {
    await deleteAccountData(user.id);
  } catch (err) {
    if (err instanceof Error && err.message === NEEDS_ANOTHER_ADMIN) {
      return fail(409, "You're the only admin of a family other people use. Make someone else an admin, or remove them, under Family sharing first. Nothing was deleted.");
    }
    throw err;
  }
  return json({ ok: true });
});
