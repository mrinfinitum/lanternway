import { childAccess, json, todayFor, withUser } from "@/lib/api/http";
import { homeData } from "@/lib/api/screens";
import type { HomeResponse } from "@lanternway/shared/api";

/** GET /api/v1/children/:childId/home?tz= → Home: this week's logs, recent check-ins, plan, meds, current providers. */
export const GET = withUser<{ childId: string }>(async (request, user, { childId }) => {
  const access = await childAccess(user, childId);
  if (access instanceof Response) return access;
  return json({ access, ...(await homeData(user.id, childId, todayFor(request))) } satisfies HomeResponse);
});
