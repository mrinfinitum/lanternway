import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentChild, getMedicationChanges, getMedications, getToday } from "@/lib/data";
import { ageOn } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import { communicationStyleLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { ChildAvatar } from "../_components/app-header";
import { HealthDetails } from "./health-details";
import type { AboutMeProfile } from "./share";
import { SharePanel } from "./share-panel";

export const metadata: Metadata = { title: "About Me · Lanternway" };

export default async function AboutMePage() {
  const [child, today] = await Promise.all([getCurrentChild(), getToday()]);
  const [medications, changes] = await Promise.all([getMedications(child.id), getMedicationChanges(child.id)]);
  const meds = medications.map((m) => {
    const latest = changes.filter((c) => c.medicationId === m.id).at(-1);
    return `${m.name} ${latest?.doseMg} mg — ${latest?.schedule.toLowerCase()}`;
  });

  const profile: AboutMeProfile = {
    firstName: child.firstName,
    age: ageOn(child.birthDate, today),
    pronouns: child.pronouns,
    intro: child.aboutMe,
    introHealth: child.aboutMeHealth,
    strengths: child.strengths,
    likes: child.likes,
    dislikes: child.dislikes,
    communication: `${communicationStyleLabels[child.communicationStyle]}. ${child.communicationNotes}`,
    helps: child.calmingStrategies,
    sensory: child.sensoryNeeds,
    hard: child.triggers,
    dailyLife: child.dailyLife,
    diagnoses: child.diagnoses.map((d) => d.name),
    medications: meds,
    allergies: child.allergies,
    contacts: child.emergencyContacts.map((c) => `${c.name} · ${c.phone}`),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="About Me"
        description={`Everything someone new should know about ${child.firstName}.`}
        action={<SharePanel profile={profile} />}
      />

      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <ChildAvatar child={child} size={72} />
          <div>
            <h2 className="text-xl font-extrabold">{child.firstName}</h2>
            <p className="text-sm text-muted-foreground">
              Age {profile.age} · born {formatDate(child.birthDate)}
              {child.pronouns && ` · ${child.pronouns}`}
            </p>
            <p className="mt-2">{child.aboutMe}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <ListCard title="My strengths" items={child.strengths} empty={`What is ${child.firstName} good at, or proud of?`} />
        <Card>
          <CardContent>
            <h3 className="mb-2 font-extrabold">Loves</h3>
            <BulletList items={child.likes} />
            {child.dislikes.length > 0 && (
              <>
                <h4 className="mt-4 mb-2 font-bold">Not a fan of</h4>
                <BulletList items={child.dislikes} />
              </>
            )}
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardContent>
            <h3 className="font-extrabold">Communication</h3>
            <p className="mt-1 text-sm font-semibold">{communicationStyleLabels[child.communicationStyle]}</p>
            <p className="mt-1 text-sm">{child.communicationNotes}</p>
          </CardContent>
        </Card>
        <ListCard title="What helps" items={child.calmingStrategies} />
        <ListCard title="Sensory needs" items={child.sensoryNeeds} />
        <ListCard title="Things that are hard" items={child.triggers} />
        <ListCard title="Daily life" items={child.dailyLife} empty="Routines, meals, sleep, and safety notes." />
      </div>

      <HealthDetails>
        <section className="rounded-xl bg-paper p-4">
          <h3 className="mb-2 font-extrabold">Diagnoses</h3>
          <ul className="space-y-1 text-sm">
            {child.diagnoses.map((d) => (
              <li key={d.name}>
                <span className="font-semibold">{d.name}</span>
                <span className="text-muted-foreground"> · {formatDate(d.diagnosedOn)}{d.diagnosedBy && `, ${d.diagnosedBy}`}</span>
              </li>
            ))}
          </ul>
          {child.aboutMeHealth && (
            <p className="mt-3 text-sm">
              <span className="font-semibold">In {child.firstName}&apos;s words: </span>
              {child.aboutMeHealth}
            </p>
          )}
        </section>
        <section className="rounded-xl bg-paper p-4">
          <h3 className="mb-2 font-extrabold">Medications</h3>
          <ul className="space-y-1 text-sm">
            {meds.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl bg-paper p-4">
          <h3 className="mb-2 font-extrabold">Allergies</h3>
          {child.allergies.length > 0 ? (
            <BulletList items={child.allergies} />
          ) : (
            <p className="text-sm text-muted-foreground">None recorded.</p>
          )}
        </section>
        <section className="rounded-xl bg-paper p-4">
          <h3 className="mb-2 font-extrabold">Emergency contacts</h3>
          <ul className="space-y-2 text-sm">
            {child.emergencyContacts.map((c) => (
              <li key={c.name}>
                <p className="font-semibold">{c.name}</p>
                <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="text-muted-foreground hover:underline">
                  {c.phone}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </HealthDetails>
    </div>
  );
}

function ListCard({ title, items, empty, className }: { title: string; items: string[]; empty?: string; className?: string }) {
  return (
    <Card className={cn(className)}>
      <CardContent>
        <h3 className="mb-2 font-extrabold">{title}</h3>
        {items.length > 0 ? (
          <BulletList items={items} />
        ) : (
          <p className="text-sm text-muted-foreground">{empty ?? "Nothing added yet."}</p>
        )}
      </CardContent>
    </Card>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  );
}
