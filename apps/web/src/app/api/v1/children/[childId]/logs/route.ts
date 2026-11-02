import { childAccess, json, withUser } from "@/lib/api/http";
import { childLogs, childMilestones } from "@/lib/child-data";
import type { IsoDate } from "@lanternway/shared/types";

const isDate = (v: string | null): v is IsoDate => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** GET /api/v1/children/:childId/logs?from=&to= → daily logs and milestones in that range (both optional). */
export const GET = withUser<{ childId: string }>(async (request, user, { childId }) => {
  const access = await childAccess(user, childId);
  if (access instanceof Response) return access;
  const params = new URL(request.url).searchParams;
  const from = params.get("from");
  const to = params.get("to");
  const range = isDate(from) || isDate(to) ? { from: isDate(from) ? from : undefined, to: isDate(to) ? to : undefined } : undefined;
  const [logs, milestones] = await Promise.all([childLogs(user.id, childId, range), childMilestones(user.id, childId, range)]);
  return json({ logs, milestones });
});
