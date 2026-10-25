import type { Metadata } from "next";
import { CloudRain, Ear, Heart, MessageCircleHeart, Sparkles, Star, Sun } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getCurrentChild, getMedicationChanges, getMedications, getToday } from "@/lib/data";
import { ageOn } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import { communicationStyleLabels } from "@/lib/labels";
import { HealthDetails } from "./health-details";
import { ChipList, DotList, ProfileHero, ProfileSection, QuickLook } from "./profile-sections";
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

      <ProfileHero child={child} age={profile.age} />
      <QuickLook child={child} />

      <div className="grid gap-4 md:grid-cols-2">
        <ProfileSection id="strengths" icon={Star} title="My strengths" accent="amber">
          <DotList items={child.strengths} accent="amber" icon={Star} empty={`What is ${child.firstName} good at, or proud of?`} />
        </ProfileSection>
        <ProfileSection id="loves" icon={Heart} title="Things I love" accent="coral">
          <ChipList items={child.likes} accent="coral" />
          {child.dislikes.length > 0 && (
            <>
              <h4 className="mt-4 mb-2 text-sm font-bold text-teal/80">Not a fan of</h4>
              <ChipList items={child.dislikes} accent="cream" />
            </>
          )}
        </ProfileSection>
        <ProfileSection id="communication" icon={MessageCircleHeart} title="How I communicate" accent="teal" className="md:col-span-2">
          <p className="mb-2 inline-block rounded-full bg-teal px-3 py-1 text-sm font-bold text-paper">
            {communicationStyleLabels[child.communicationStyle]}
          </p>
          <p className="text-base leading-relaxed">{child.communicationNotes}</p>
        </ProfileSection>
        <ProfileSection id="helps" icon={Sparkles} title="What helps me" accent="amber">
          <DotList items={child.calmingStrategies} accent="amber" icon={Sparkles} />
        </ProfileSection>
        <ProfileSection id="sensory" icon={Ear} title="Sensory needs" accent="teal">
          <DotList items={child.sensoryNeeds} accent="teal" />
        </ProfileSection>
        <ProfileSection id="hard" icon={CloudRain} title="Things that are hard for me" accent="cream">
          <DotList items={child.triggers} accent="cream" />
        </ProfileSection>
        <ProfileSection id="daily" icon={Sun} title="My day" accent="amber">
          <DotList items={child.dailyLife} accent="amber" empty="Routines, meals, sleep, and safety notes." />
        </ProfileSection>
      </div>

      <HealthDetails>
        <section className="rounded-xl bg-white p-4">
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
        <section className="rounded-xl bg-white p-4">
          <h3 className="mb-2 font-extrabold">Medications</h3>
          {meds.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {meds.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">None recorded.</p>
          )}
        </section>
        <section className="rounded-xl bg-white p-4">
          <h3 className="mb-2 font-extrabold">Allergies</h3>
          {child.allergies.length > 0 ? (
            <BulletList items={child.allergies} />
          ) : (
            <p className="text-sm text-muted-foreground">None recorded.</p>
          )}
        </section>
        <section className="rounded-xl bg-white p-4">
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

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  );
}
