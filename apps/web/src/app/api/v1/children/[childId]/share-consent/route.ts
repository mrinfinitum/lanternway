import { childAccess, json, readBody, withUser } from "@/lib/api/http";
import { recordConsents } from "@/lib/consents";

/**
 * POST /api/v1/children/:childId/share-consent { sections: string[], audience } → { ok }.
 * Records the parent's consent to share these About Me sections. Admins.
 */
export const POST = withUser<{ childId: string }>(async (request, user, { childId }) => {
  const access = await childAccess(user, childId, "admin");
  if (access instanceof Response) return access;
  const body = await readBody(request);
  const sections = (Array.isArray(body?.sections) ? body.sections : []).filter((s): s is string => typeof s === "string" && /^[a-zA-Z]{2,20}$/.test(s)).slice(0, 20);
  const audience = typeof body?.audience === "string" ? body.audience.slice(0, 40) : null;
  await recordConsents(user.id, ["share_profile"], { childId, sections, audience });
  return json({ ok: true });
});
