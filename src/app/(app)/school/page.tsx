import type { Metadata } from "next";
import { SectionHeading } from "@/components/page-header";
import { Stat } from "@/components/stat";
import {
  getAccommodations,
  getCheckInLinks,
  getCheckInRespondents,
  getCheckIns,
  getCurrentChild,
  getIepGoals,
  getIepPlan,
  getSchoolMessages,
  getToday,
} from "@/lib/data";
import { isSavedChildId } from "@/lib/child-profile";
import { addDays } from "@/lib/dates";
import { formatAverage, formatShortDate, plural } from "@/lib/format";
import { summarizeCheckIns } from "@/lib/insights";
import { respondentRoleLabels } from "@/lib/labels";
import { CheckInLinks } from "./check-in-links";
import { SchoolManager } from "./school-manager";

// Reads the signed-in session, so navigations wait for the server (see app layout).
export const instant = false;

export const metadata: Metadata = { title: "School · Lanternway" };

export default async function SchoolPage() {
  const [child, today] = await Promise.all([getCurrentChild(), getToday()]);
  const plan = await getIepPlan(child.id);
  const [goals, supports, messages, respondents, links, recentCheckIns] = await Promise.all([
    plan ? getIepGoals(plan.id) : [],
    plan ? getAccommodations(plan.id) : [],
    getSchoolMessages(child.id),
    getCheckInRespondents(child.id),
    getCheckInLinks(child.id),
    getCheckIns(child.id, { from: addDays(today, -27), to: today }),
  ]);
  const respondentName = (id: string) => respondents.find((r) => r.id === id)?.name ?? "Teacher";
  const teacher = summarizeCheckIns(recentCheckIns);

  const checkIns = (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Focus" value={formatAverage(teacher.focus)} unit="/ 5" />
        <Stat label="Mood" value={formatAverage(teacher.mood)} unit="/ 5" />
        <Stat label="Behavior" value={formatAverage(teacher.behavior)} unit="/ 5" />
        <Stat label="Participation" value={formatAverage(teacher.participation)} unit="/ 5" />
      </div>
      <p className="-mt-3 text-xs text-muted-foreground">Averages from {plural(teacher.count, "check-in")} in the last 4 weeks.</p>

      <section aria-labelledby="links">
        <SectionHeading id="links">Check-in links</SectionHeading>
        <p className="mb-3 text-sm text-muted-foreground">
          Each link is private to one person and only opens a short form. They never see {child.firstName}&apos;s record.
        </p>
        <CheckInLinks
          childId={child.id}
          childName={child.firstName}
          saved={isSavedChildId(child.id)}
          respondents={respondents}
          today={today}
          links={links.map((l) => {
            const r = respondents.find((x) => x.id === l.respondentId);
            return { ...l, name: r?.name ?? "", role: r ? respondentRoleLabels[r.role] : "" };
          })}
        />
      </section>

      <section aria-labelledby="recent-checkins">
        <SectionHeading id="recent-checkins">Recent check-ins</SectionHeading>
        {recentCheckIns.length === 0 && (
          <p className="text-sm text-muted-foreground">No check-ins in the last 4 weeks yet.</p>
        )}
        <ul className="space-y-2">
          {[...recentCheckIns].reverse().map((c) => (
            <li key={c.id} className="rounded-2xl border p-3 text-sm">
              <p className="flex justify-between gap-2 font-bold">
                {respondentName(c.respondentId)}
                <span className="font-normal text-muted-foreground">{formatShortDate(c.date)}</span>
              </p>
              <p className="text-muted-foreground">
                Focus {c.ratings.focus} · Mood {c.ratings.mood} · Behavior {c.ratings.behavior} · Participation {c.ratings.participation}
              </p>
              {c.note && <p className="mt-1">“{c.note}”</p>}
            </li>
          ))}
        </ul>
      </section>
    </>
  );

  return (
    <SchoolManager
      key={child.id}
      childId={child.id}
      childName={child.firstName}
      school={child.school}
      today={today}
      plans={plan ? [plan] : []}
      goals={goals}
      supports={supports}
      messages={messages}
      checkIns={checkIns}
    />
  );
}
