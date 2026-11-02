import { fail, familyAccess, json, readBody, str, withUser } from "@/lib/api/http";
import { recordConsents } from "@/lib/consents";
import { createInvite, type FamilyRole } from "@/lib/sharing";

/**
 * POST /api/v1/families/:familyId/invites { label, role: "admin" | "log" | "view", days: 7 | 30, consent: true }
 * → { token }. Returned this once (only its hash is stored); the app shares
 * `https://<site>/join/<token>` with the system share sheet. Admins.
 */
export const POST = withUser<{ familyId: string }>(async (request, user, { familyId }) => {
  const family = await familyAccess(user, familyId, "admin");
  if (family instanceof Response) return family;
  const body = await readBody(request);
  if (body?.consent !== true) return fail(400, "Please confirm you'd like to share your family's records with this person.");
  const role = str(body.role) as FamilyRole;
  const days = Number(body.days);
  const result = await createInvite(user.id, { familyId, label: str(body.label), role, days });
  if (typeof result === "string") return fail(400, result);
  await recordConsents(user.id, ["share_family"], { familyId, role, days });
  return json({ token: result.token });
});
