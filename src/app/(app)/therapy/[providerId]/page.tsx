import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { SectionHeading } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getAllProviderIds, getChildren, getCurrentChild, getProvider, getTherapyGoals, getTherapySessions } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { providerTypeLabels } from "@/lib/labels";
import type { GoalStatus } from "@/lib/types";
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
  const provider = await getProvider(child.id, providerId);
  if (!provider) notFound();
  const [goals, sessions] = await Promise.all([getTherapyGoals(provider.id), getTherapySessions(provider.id)]);
  const goalTitles = Object.fromEntries(goals.map((g) => [g.id, g.title]));

  return (
    <div className="space-y-8">
      <div>
        <Badge variant="secondary" className="mb-2 block w-fit">{providerTypeLabels[provider.type]}</Badge>
        <h1 className="text-2xl font-extrabold md:text-3xl">
          {provider.name}
          {provider.credentials && <span className="text-lg font-semibold text-muted-foreground">, {provider.credentials}</span>}
        </h1>
        <p className="text-muted-foreground">{provider.practice}</p>
      </div>

      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Schedule</p>
            <p className="font-semibold">{provider.schedule ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">With {child.firstName} since</p>
            <p className="font-semibold">
              {formatDate(provider.startDate)}
              {provider.endDate && ` – ${formatDate(provider.endDate)}`}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <a href={`tel:${provider.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-2 font-semibold hover:underline">
              <Phone className="size-4" aria-hidden /> {provider.phone}
            </a>
            {provider.email && (
              <a href={`mailto:${provider.email}`} className="inline-flex items-center gap-2 font-semibold break-all hover:underline">
                <Mail className="size-4 shrink-0" aria-hidden /> {provider.email}
              </a>
            )}
          </div>
        </CardContent>
      </Card>

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
