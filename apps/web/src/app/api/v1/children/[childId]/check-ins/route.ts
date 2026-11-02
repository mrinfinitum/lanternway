import { childAccess, json, withUser } from "@/lib/api/http";
import { checkInData } from "@/lib/api/screens";

/** GET /api/v1/children/:childId/check-ins → people asked for check-ins, their links (never the tokens) and check-ins. */
export const GET = withUser<{ childId: string }>(async (_request, user, { childId }) => {
  const access = await childAccess(user, childId);
  if (access instanceof Response) return access;
  return json({ access, ...(await checkInData(user.id, childId)) });
});
