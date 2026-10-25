import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { SectionHeading } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getAllProviderIds, getChildren, getCurrentChild, getProvider, getTherapyGoals, getTherapySessions, getToday } from "@/lib/data";
import { formatDate } from "@/lib/format";
import type { GoalStatus } from "@/lib/types";
import { ProviderAddedThisVisit, ProviderHeader } from "../care-team";
import { SessionList } from "./session-list";

export async function generateStaticParams() {
  return (await getAllProviderIds()).map((providerId) => ({ providerId }));
}

export async function generateMetadata({ params }: PageProps<"/therapy/[providerId]">): Promise<Metadata> {
  const { providerId } = await params;
  for (const kid of await getChildren()) {
    const provider = await getProvider(kid.id, providerId);
    if (provider) return { title: `${provider.name} · Lanternway` };
  }
  return { title: "Care team · Lanternway" };
}

const statusLabels: Record<GoalStatus, string> = {
  active: "Working on it",
  met: "Met",
  paused: "Paused",
  ended: "Ended",
};

export default function ProviderPage({ params }: PageProps<"/therapy/[providerId]">) {
  return (
    <div>
      <Link href="/therapy" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-teal">
        <ArrowLeft className="size-4" aria-hidden /> Therapy & care team
      </Link>
      <Suspense fallback={<div className="h-96 rounded-2xl bg-card" />}>
        <ProviderDetails params={params} />
      </Suspense>
    </div>
  );
}

async function ProviderDetails({ params }: { params: PageProps<"/therapy/[providerId]">["params"] }) {
  const { providerId } = await params;
  const child = await getCurrentChild();
  const [provider, today] = await Promise.all([getProvider(child.id, providerId), getToday()]);
  if (!provider) {
    // Providers added during this visit only exist in the browser for now.
    if (providerId.includes("-local-")) return <ProviderAddedThisVisit id={providerId} childName={child.firstName} today={today} />;
    notFound();
  }
  const [goals, sessions] = await Promise.all([getTherapyGoals(provider.id), getTherapySessions(provider.id)]);
  const goalTitles = Object.fromEntries(goals.map((g) => [g.id, g.title]));

  return (
    <div className="space-y-8">
      <ProviderHeader provider={provider} childName={child.firstName} today={today} />

      {goals.length > 0 && (
        <section aria-labelledby="goals">
          <SectionHeading id="goals">Goals</SectionHeading>
          <div className="grid gap-3 md:grid-cols-2">
            {goals.map((goal) => {
              const latest = goal.progress.at(-1);
              const first = goal.progress[0];
              const notes = goal.progress.filter((p) => p.note);
              return (
                <Card key={goal.id}>
                  <CardContent className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-extrabold">{goal.title}</h3>
                      <Badge variant={goal.status === "met" ? "default" : "secondary"} className={goal.status === "met" ? "bg-amber text-teal" : "bg-white"}>
                        {statusLabels[goal.status]}
                      </Badge>
                    </div>
                    <p className="text-sm">{goal.description}</p>
                    {latest && (
                      <div>
                        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                          <span>Progress toward goal</span>
                          <span className="font-bold text-teal">{latest.percent}%</span>
                        </div>
                        <Progress value={latest.percent} className="h-2 bg-white [&>*]:bg-amber" aria-label={`${goal.title}: ${latest.percent}%`} />
                        <p className="mt-1 text-xs text-muted-foreground">
                          {first && first !== latest && `Started at ${first.percent}% on ${formatDate(first.date)}. `}
                          Last update {formatDate(latest.date)}.
                        </p>
                      </div>
                    )}
                    {notes.length > 0 && (
                      <ul className="space-y-1 text-xs">
                        {notes.map((n) => (
                          <li key={n.date}>
                            <span className="font-semibold">{formatDate(n.date)}:</span> {n.note}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <section aria-labelledby="sessions">
        <SectionHeading id="sessions">Session notes</SectionHeading>
        <SessionList sessions={[...sessions].reverse()} goalTitles={goalTitles} />
      </section>
    </div>
  );
}
