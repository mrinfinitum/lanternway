import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { getCurrentChild, getProviders, getTherapyGoals, getTherapySessions, getToday } from "@/lib/data";
import { CareTeamList } from "./care-team";

export const metadata: Metadata = { title: "Therapy · Lanternway" };

export default async function TherapyPage() {
  const [child, today] = await Promise.all([getCurrentChild(), getToday()]);
  const providers = await getProviders(child.id);
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
    </div>
  );
}
