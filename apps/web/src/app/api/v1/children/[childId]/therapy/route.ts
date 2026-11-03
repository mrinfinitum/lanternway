import { childAccess, json, todayFor, withUser } from "@/lib/api/http";
import type { TherapyResponse } from "@lanternway/shared/api";
import { therapyData } from "@/lib/api/screens";

/** GET /api/v1/children/:childId/therapy?tz= → providers with their goals and sessions, and meds for the care calendar. */
export const GET = withUser<{ childId: string }>(async (request, user, { childId }) => {
  const access = await childAccess(user, childId);
  if (access instanceof Response) return access;
  return json({ access, ...(await therapyData(user.id, childId, todayFor(request))) } satisfies TherapyResponse);
});
