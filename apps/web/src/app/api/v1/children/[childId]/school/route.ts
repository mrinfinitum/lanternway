import { childAccess, json, withUser } from "@/lib/api/http";
import type { SchoolResponse } from "@lanternway/shared/api";
import { schoolData } from "@/lib/api/screens";

/** GET /api/v1/children/:childId/school → the current IEP/504 plan, goals, supports and school messages. */
export const GET = withUser<{ childId: string }>(async (_request, user, { childId }) => {
  const access = await childAccess(user, childId);
  if (access instanceof Response) return access;
  return json({ access, ...(await schoolData(user.id, childId)) } satisfies SchoolResponse);
});
