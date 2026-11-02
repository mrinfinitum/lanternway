import type { Metadata } from "next";
import { PageHeader, SectionHeading } from "@/components/page-header";
import {
  getCurrentChild,
  getMedicationChanges,
  getMedicationReminders,
  getMedications,
  getProviders,
  getTherapyGoals,
  getTherapySessions,
  getToday,
} from "@/lib/data";
import { CareCalendar } from "../_components/care-calendar";
import { CareTeamList } from "./care-team";

// Reads the signed-in session, so navigations wait for the server (see app layout).
export const instant = false;

export const metadata: Metadata = { title: "Therapy · Lanternway" };

export default async function TherapyPage() {
  const [child, today] = await Promise.all([getCurrentChild(), getToday()]);
  const [providers, medications, changes, reminders] = await Promise.all([
    getProviders(child.id),
    getMedications(child.id),
    getMedicationChanges(child.id),
    getMedicationReminders(child.id),
  ]);
  const sessions = (await Promise.all(providers.map((p) => getTherapySessions(p.id)))).flat();
  const summaries = Object.fromEntries(
    await Promise.all(
      providers.map(async (p) => {
        const [goals, sessions] = await Promise.all([getTherapyGoals(p.id), getTherapySessions(p.id)]);
        return [
          p.id,
          {
            activeGoals: goals.filter((g) => g.status === "active").length,
            totalGoals: goals.length,
            lastSession: sessions.at(-1)?.date,
          },
        ] as const;
      }),
    ),
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Therapy & care team"
        description={`Everyone who supports ${child.firstName}, their goals, and session notes.`}
      />
      <CareTeamList key={child.id} childId={child.id} childName={child.firstName} today={today} providers={providers} summaries={summaries} />
      <section aria-labelledby="calendar-heading">
        <SectionHeading id="calendar-heading">Calendar</SectionHeading>
        <CareCalendar
          key={child.id}
          childId={child.id}
          childName={child.firstName}
          today={today}
          medications={medications}
          changes={changes}
          reminders={reminders}
          providers={providers}
          sessions={sessions.map(({ id, providerId, date, durationMinutes, summary }) => ({ id, providerId, date, durationMinutes, summary }))}
          initialLayers={["therapy"]}
        />
      </section>
    </div>
  );
}
