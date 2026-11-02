import { childAccess, fail, json, readBody, str, withUser } from "@/lib/api/http";
import { createCheckInLink } from "@/lib/checkins";
import { recordConsents } from "@/lib/consents";
import type { RespondentRole } from "@lanternway/shared/types";

/**
 * POST /api/v1/children/:childId/check-in-links
 *   { respondentId } or { respondent: { name, role, email? } }, days: 30 | 90 | 180, consent: true
 * → { token }. The token is returned this once (only its hash is stored); the app
 * shares `https://<site>/c/<token>` with the system share sheet. Admins.
 */
export const POST = withUser<{ childId: string }>(async (request, user, { childId }) => {
  const access = await childAccess(user, childId, "admin");
  if (access instanceof Response) return access;
  const body = await readBody(request);
  if (body?.consent !== true) return fail(400, "Please confirm you'd like to ask this person for check-ins.");
  const respondent = body.respondent as { name?: unknown; role?: unknown; email?: unknown } | undefined;
  const result = await createCheckInLink(user.id, {
    childId,
    respondentId: str(body.respondentId) || undefined,
    respondent: respondent
      ? { name: str(respondent.name), role: str(respondent.role) as RespondentRole, email: str(respondent.email) || undefined }
      : undefined,
    days: Number(body.days),
  });
  if (typeof result === "string") return fail(400, result);
  await recordConsents(user.id, ["share_checkin"], { childId, days: Number(body.days) });
  return json({ token: result.token });
});
