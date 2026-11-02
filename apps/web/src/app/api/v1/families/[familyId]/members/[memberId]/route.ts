import { fail, familyAccess, json, readBody, str, withUser } from "@/lib/api/http";
import { changeMemberRole, removeMember, type FamilyRole } from "@/lib/sharing";

type Params = { familyId: string; memberId: string };

/** PATCH /api/v1/families/:familyId/members/:memberId { role } → { ok }. Admins. A family always keeps an admin. */
export const PATCH = withUser<Params>(async (request, user, { familyId, memberId }) => {
  const family = await familyAccess(user, familyId, "admin");
  if (family instanceof Response) return family;
  if (!family.members.some((m) => m.userId === memberId)) return fail(404, "We couldn't find that.");
  const error = await changeMemberRole(user.id, familyId, memberId, str((await readBody(request))?.role) as FamilyRole);
  return error ? fail(409, error) : json({ ok: true });
});

/** DELETE /api/v1/families/:familyId/members/:memberId → removes someone (admins), or leaves the family (yourself). */
export const DELETE = withUser<Params>(async (_request, user, { familyId, memberId }) => {
  const family = await familyAccess(user, familyId, memberId === user.id ? "view" : "admin");
  if (family instanceof Response) return family;
  if (!family.members.some((m) => m.userId === memberId)) return fail(404, "We couldn't find that.");
  const error = await removeMember(user.id, familyId, memberId);
  return error ? fail(409, error) : json({ ok: true });
});
