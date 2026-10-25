import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentChild, getMedicationChanges, getMedications, getToday } from "@/lib/data";
import { ageOn } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import { communicationStyleLabels } from "@/lib/labels";
import { ChildAvatar } from "../_components/app-header";
import type { OnePagerData } from "./one-pager";
import { SharePanel } from "./share-panel";

export const metadata: Metadata = { title: "About Me · Lanternway" };

export default async function AboutMePage() {
  const [child, today] = await Promise.all([getCurrentChild(), getToday()]);
  const [medications, changes] = await Promise.all([getMedications(child.id), getMedicationChanges(child.id)]);
  const meds = medications.map((m) => {
    const latest = changes.filter((c) => c.medicationId === m.id).at(-1);
    return `${m.name} ${latest?.doseMg} mg — ${latest?.schedule.toLowerCase()}`;
  });

  const data: OnePagerData = {
    firstName: child.firstName,
    age: ageOn(child.birthDate, today),
    pronouns: child.pronouns,
    aboutMe: child.aboutMe,
    communication: `${communicationStyleLabels[child.communicationStyle]}. ${child.communicationNotes}`,
    hard: child.triggers,
    helps: child.calmingStrategies,
    sensory: child.sensoryNeeds,
    likes: child.likes,
    diagnoses: child.diagnoses.map((d) => d.name),
    medications: meds,
    contacts: child.emergencyContacts.map((c) => `${c.name} · ${c.phone}`),
  };

  const sections: { title: string; items: string[] }[] = [
    { title: "Things that are hard", items: child.triggers },
    { title: "What helps", items: child.calmingStrategies },
    { title: "Sensory needs", items: child.sensoryNeeds },
    { title: "Loves", items: child.likes },
    { title: "Not a fan of", items: child.dislikes },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="About Me" description={`Everything someone new should know about ${child.firstName}.`} />

      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <ChildAvatar child={child} size={72} />
          <div>
            <h2 className="text-xl font-extrabold">{child.firstName}</h2>
            <p className="text-sm text-muted-foreground">
              Age {data.age} · born {formatDate(child.birthDate)}
              {child.pronouns && ` · ${child.pronouns}`}
            </p>
            <p className="mt-2">{child.aboutMe}</p>
          </div>
        </CardContent>
      </Card>

      <SharePanel data={data} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardContent>
            <h3 className="font-extrabold">Communication</h3>
            <p className="mt-1 text-sm font-semibold">{communicationStyleLabels[child.communicationStyle]}</p>
            <p className="mt-1 text-sm">{child.communicationNotes}</p>
          </CardContent>
        </Card>
        {sections.map((s) => (
          <Card key={s.title}>
            <CardContent>
              <h3 className="mb-2 font-extrabold">{s.title}</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {s.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent>
            <h3 className="mb-2 font-extrabold">Diagnoses</h3>
            <ul className="space-y-1 text-sm">
              {child.diagnoses.map((d) => (
                <li key={d.name}>
                  <span className="font-semibold">{d.name}</span>
                  <span className="text-muted-foreground"> · {formatDate(d.diagnosedOn)}{d.diagnosedBy && `, ${d.diagnosedBy}`}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h3 className="mb-2 font-extrabold">Medications</h3>
            <ul className="space-y-1 text-sm">
              {meds.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardContent>
            <h3 className="mb-2 font-extrabold">Emergency contacts</h3>
            <ul className="grid gap-2 text-sm sm:grid-cols-3">
              {child.emergencyContacts.map((c) => (
                <li key={c.name}>
                  <p className="font-semibold">{c.name}</p>
                  <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="text-muted-foreground hover:underline">
                    {c.phone}
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
