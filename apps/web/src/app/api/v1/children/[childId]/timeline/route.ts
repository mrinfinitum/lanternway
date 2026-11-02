import { childAccess, json, todayFor, withUser } from "@/lib/api/http";
import { timelineData } from "@/lib/api/screens";

/** GET /api/v1/children/:childId/timeline?tz= → the lifelong timeline's records, plus the last month of logs and check-ins. */
export const GET = withUser<{ childId: string }>(async (request, user, { childId }) => {
  const access = await childAccess(user, childId);
  if (access instanceof Response) return access;
  return json({ access, ...(await timelineData(user.id, childId, todayFor(request))) });
});
