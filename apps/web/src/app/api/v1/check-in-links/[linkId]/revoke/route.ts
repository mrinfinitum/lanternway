import { childAccess, childOf, fail, json, withUser } from "@/lib/api/http";
import { revokeCheckInLink } from "@/lib/checkins";

/** POST /api/v1/check-in-links/:linkId/revoke → turns the link off right away. Admins. */
export const POST = withUser<{ linkId: string }>(async (_request, user, { linkId }) => {
  const owner = await childOf(user, "checkin_links", linkId);
  if (!owner) return fail(404, "We couldn't find that.");
  const access = await childAccess(user, owner.childId, "admin");
  if (access instanceof Response) return access;
  return (await revokeCheckInLink(user.id, linkId)) ? json({ ok: true }) : fail(409, "That link is already turned off.");
});
