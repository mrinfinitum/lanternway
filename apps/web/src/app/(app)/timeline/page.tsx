import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import {
  getCheckInRespondents,
  getCheckIns,
  getCurrentChild,
  getIepPlan,
  getLogs,
  getMedicationChanges,
  getMedications,
  getMilestones,
  getProviders,
  getSchoolMessages,
  getTherapySessions,
  getToday,
} from "@/lib/data";
import { addDays } from "@lanternway/shared/dates";
import { timelineEvents } from "@lanternway/shared/timeline";
import { TimelineView } from "./timeline-view";

// Reads the signed-in session, so navigations wait for the server (see app layout).
export const instant = false;

export const metadata: Metadata = { title: "Timeline · Lanternway" };

export default async function TimelinePage() {
  const [child, today] = await Promise.all([getCurrentChild(), getToday()]);
  const monthFrom = addDays(today, -29);

  const [milestones, medications, changes, plan, messages, providers, recentLogs, checkIns, respondents] =
    await Promise.all([
      getMilestones(child.id),
      getMedications(child.id),
      getMedicationChanges(child.id),
      getIepPlan(child.id),
      getSchoolMessages(child.id),
      getProviders(child.id),
      getLogs(child.id, { from: monthFrom, to: today }),
      getCheckIns(child.id, { from: monthFrom, to: today }),
      getCheckInRespondents(child.id),
    ]);
  const sessions = (await Promise.all(providers.map((p) => getTherapySessions(p.id)))).flat();
  const events = timelineEvents({
    today,
    milestones,
    medications,
    medicationChanges: changes,
    iepPlan: plan,
    schoolMessages: messages,
    providers,
    sessions,
    logs: recentLogs,
    checkIns,
    respondents,
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Timeline" description={`${child.firstName}'s journey so far — zoom out to see the whole picture.`} />
      <TimelineView events={events} today={today} birthDate={child.birthDate} />
    </div>
  );
}
