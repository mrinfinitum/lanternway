import { fail, familyAccess, json, withUser } from "@/lib/api/http";
import { revokeInvite } from "@/lib/sharing";

/** POST /api/v1/families/:familyId/invites/:inviteId/cancel → turns an unused invite off. Admins. */
export const POST = withUser<{ familyId: string; inviteId: string }>(async (_request, user, { familyId, inviteId }) => {
  const family = await familyAccess(user, familyId, "admin");
  if (family instanceof Response) return family;
  if (!family.invites.some((i) => i.id === inviteId)) return fail(404, "We couldn't find that.");
  return (await revokeInvite(user.id, inviteId)) ? json({ ok: true }) : fail(409, "That invite was already used or turned off.");
});
