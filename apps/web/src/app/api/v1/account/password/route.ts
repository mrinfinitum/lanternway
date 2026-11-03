import { authForRequest } from "@/lib/api/auth";
import { fail, json, readBody, withUser } from "@/lib/api/http";
import { passwordProblem } from "@lanternway/shared/password-policy";

/**
 * POST /api/v1/account/password { currentPassword, newPassword } → { token }.
 * Other devices are signed out; this device gets a new token to store.
 */
export const POST = withUser(async (request, user) => {
  const body = await readBody(request);
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
  if (!currentPassword) return fail(400, "Please enter your current password.");
  const problem = passwordProblem(newPassword, user.email);
  if (problem) return fail(400, problem);
  const { server, newToken } = authForRequest(request);
  const { error } = await server.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
  if (error) {
    return error.status === 401 || /invalid|password/i.test(error.code ?? "")
      ? fail(400, "Your current password isn't right.")
      : fail(502, "We couldn't change your password. Please try again.");
  }
  return json({ ok: true, token: newToken() });
});
