import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { PageHeader, SectionHeading } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { getCurrentChild, getProviders, getTherapyGoals, getTherapySessions } from "@/lib/data";
import { formatDate, plural } from "@/lib/format";
import { providerTypeLabels } from "@/lib/labels";
import type { Provider } from "@/lib/types";

export const metadata: Metadata = { title: "Therapy · Lanternway" };

export default async function TherapyPage() {
  const child = await getCurrentChild();
  const providers = await getProviders(child.id);
  const details = await Promise.all(
    providers.map(async (p) => ({
      provider: p,
      goals: await getTherapyGoals(p.id),
      lastSession: (await getTherapySessions(p.id)).at(-1),
    })),
  );
  const current = details.filter((d) => !d.provider.endDate);
  const past = details.filter((d) => d.provider.endDate);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Therapy & care team"
        description={`Everyone who supports ${child.firstName}, their goals, and session notes.`}
      />
      <section aria-labelledby="current-team">
        <SectionHeading id="current-team">Current</SectionHeading>
        <ul className="grid gap-3 md:grid-cols-2">
          {current.map((d) => (
            <ProviderRow key={d.provider.id} {...d} />
          ))}
        </ul>
      </section>
      {past.length > 0 && (
        <section aria-labelledby="past-team">
          <SectionHeading id="past-team">Past</SectionHeading>
          <ul className="grid gap-3 md:grid-cols-2">
            {past.map((d) => (
              <ProviderRow key={d.provider.id} {...d} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ProviderRow({
  provider,
  goals,
  lastSession,
}: {
  provider: Provider;
  goals: { status: string }[];
  lastSession?: { date: string };
}) {
  const active = goals.filter((g) => g.status === "active").length;
  return (
    <li>
      <Link
        href={`/therapy/${provider.id}`}
        className="flex items-center gap-4 rounded-2xl bg-cream p-4 transition-colors hover:bg-amber/25"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-lg font-extrabold">
          {provider.name.replace("Dr. ", "")[0]}
        </span>
        <span className="min-w-0 flex-1">
          <Badge variant="secondary" className="mb-1 bg-white">{providerTypeLabels[provider.type]}</Badge>
          <span className="block font-extrabold">
            {provider.name}
            {provider.credentials && <span className="font-semibold text-muted-foreground">, {provider.credentials}</span>}
          </span>
          <span className="block text-sm text-muted-foreground">
            {provider.endDate
              ? `${formatDate(provider.startDate)} – ${formatDate(provider.endDate)}`
              : provider.schedule}
          </span>
          <span className="block text-xs text-muted-foreground">
            {goals.length > 0 && `${plural(active, "active goal")} · `}
            {lastSession ? `Last visit ${formatDate(lastSession.date)}` : "No visits logged"}
          </span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}
