import { childAccess, json, todayFor, withUser } from "@/lib/api/http";
import { medicationsData } from "@/lib/api/screens";

/** GET /api/v1/children/:childId/medications?tz= → meds, dose changes, reminder settings, and a year of logs and check-ins for the charts and calendar. */
export const GET = withUser<{ childId: string }>(async (request, user, { childId }) => {
  const access = await childAccess(user, childId);
  if (access instanceof Response) return access;
  return json({ access, ...(await medicationsData(user.id, childId, todayFor(request))) });
});
