import { fail, json, withUser } from "@/lib/api/http";
import { acceptInvite, firstChildInNewestFamily, isInviteToken } from "@/lib/sharing";

/**
 * POST /api/v1/join/:token → { status: "joined" | "already", childId } after
 * accepting a family invite (opened from a /join/<token> link).
 */
export const POST = withUser<{ token: string }>(async (_request, user, { token }) => {
  if (!isInviteToken(token)) return fail(404, "This invite has expired or been turned off. Ask for a new one.");
  const result = await acceptInvite(user.id, token);
  if (result === "used") return fail(409, "Someone has already used this invite. Ask for a new one.");
  if (result === "invalid") return fail(404, "This invite has expired or been turned off. Ask for a new one.");
  return json({ status: result, childId: result === "joined" ? await firstChildInNewestFamily(user.id) : null });
});
