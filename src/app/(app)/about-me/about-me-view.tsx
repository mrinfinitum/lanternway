"use client";

import Link from "next/link";
import { CloudRain, Ear, Heart, MessageCircleHeart, Pill, Sparkles, Star, Sun } from "lucide-react";
import { LumiTip } from "@/components/lumi-tip";
import { PageHeader } from "@/components/page-header";
import { ageOn } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import { communicationStyleLabels } from "@/lib/labels";
import type { Child, IsoDate } from "@/lib/types";
import { useRecords } from "../_components/records-store";
import { HealthDetails } from "./health-details";
import { BasicsEditor, CommunicationEditor, ContactsEditor, DiagnosesEditor, ListEditor } from "./profile-editors";
import { ChipList, DotList, ProfileHero, ProfileSection, QuickLook } from "./profile-sections";
import type { AboutMeProfile } from "./share";
import { RemoveChild } from "./remove-child";
import { SharePanel } from "./share-panel";

/** About Me with this visit's edits applied. Every section has its own Edit button. */
export function AboutMeView({
  child: saved,
  today,
  meds,
  welcome,
}: {
  child: Child;
  today: IsoDate;
  meds: string[];
  /** Just added with the "Add a child" flow. */
  welcome?: boolean;
}) {
  const child = useRecords("children", [saved]).find((c) => c.id === saved.id) ?? saved;
  const age = ageOn(child.birthDate, today);

  const profile: AboutMeProfile = {
    firstName: child.firstName,
    age,
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

  const list = (field: Parameters<typeof ListEditor>[0]["field"], title: string, itemLabel: string, placeholder?: string) => (
    <ListEditor child={child} field={field} title={title} itemLabel={itemLabel} placeholder={placeholder} />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="About Me"
        description={`Everything someone new should know about ${child.firstName}.`}
        action={<SharePanel profile={profile} />}
      />

      {welcome && (
        <LumiTip title={`Welcome, ${child.firstName}!`}>
          <p>
            Here&apos;s the start of {child.firstName}&apos;s About Me. Add more anytime with the Edit buttons, and use Share
            when you&apos;re ready to send a one-page summary to a teacher or sitter.
          </p>
        </LumiTip>
      )}

      <ProfileHero child={child} age={age} action={<BasicsEditor child={child} today={today} />} />
      <QuickLook child={child} />

      <div className="grid gap-4 md:grid-cols-2">
        <ProfileSection id="strengths" icon={Star} title="My strengths" accent="amber" action={list("strengths", "My strengths", "Strength", "e.g. Great memory for animal facts")}>
          <DotList items={child.strengths} accent="amber" icon={Star} empty={`What is ${child.firstName} good at, or proud of?`} />
        </ProfileSection>
        <ProfileSection
          id="loves"
          icon={Heart}
          title="Things I love"
          accent="coral"
          action={list("likes", "Things I love", "Thing they love", "e.g. Trains")}
        >
          <ChipList items={child.likes} accent="coral" />
          <div className="mt-4 mb-2 flex items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-teal/80">Not a fan of</h4>
            {list("dislikes", "Not a fan of", "Thing they don't like", "e.g. Socks with seams")}
          </div>
          <ChipList items={child.dislikes} accent="cream" empty="Nothing added." />
        </ProfileSection>
        <ProfileSection
          id="communication"
          icon={MessageCircleHeart}
          title="How I communicate"
          accent="teal"
          className="md:col-span-2"
          action={<CommunicationEditor child={child} />}
        >
          <p className="mb-2 inline-block rounded-full bg-teal px-3 py-1 text-sm font-bold text-paper">
            {communicationStyleLabels[child.communicationStyle]}
          </p>
          <p className="text-base leading-relaxed">{child.communicationNotes || "Add tips for talking together."}</p>
        </ProfileSection>
        <ProfileSection id="helps" icon={Sparkles} title="What helps me" accent="amber" action={list("calmingStrategies", "What helps me", "Thing that helps", "e.g. A heads-up before changes")}>
          <DotList items={child.calmingStrategies} accent="amber" icon={Sparkles} />
        </ProfileSection>
        <ProfileSection id="sensory" icon={Ear} title="Sensory needs" accent="teal" action={list("sensoryNeeds", "Sensory needs", "Sensory need", "e.g. Headphones in loud places")}>
          <DotList items={child.sensoryNeeds} accent="teal" />
        </ProfileSection>
        <ProfileSection id="hard" icon={CloudRain} title="Things that are hard for me" accent="cream" action={list("triggers", "Things that are hard for me", "Hard thing", "e.g. Sudden changes in plans")}>
          <DotList items={child.triggers} accent="cream" />
        </ProfileSection>
        <ProfileSection id="daily" icon={Sun} title="My day" accent="amber" action={list("dailyLife", "My day", "Routine or note", "e.g. Bedtime is 8:30 with a story")}>
          <DotList items={child.dailyLife} accent="amber" empty="Routines, meals, sleep, and safety notes." />
        </ProfileSection>
      </div>

      <HealthDetails>
        <HealthBox title="Diagnoses" action={<DiagnosesEditor child={child} today={today} />}>
          {child.diagnoses.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {child.diagnoses.map((d) => (
                <li key={d.name}>
                  <span className="font-semibold">{d.name}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {formatDate(d.diagnosedOn)}
                    {d.diagnosedBy && `, ${d.diagnosedBy}`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">None recorded.</p>
          )}
          {child.aboutMeHealth && (
            <p className="mt-3 text-sm">
              <span className="font-semibold">In {child.firstName}&apos;s words: </span>
              {child.aboutMeHealth}
            </p>
          )}
        </HealthBox>
        <HealthBox
          title="Medications"
          action={
            <Link href="/medications" className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold hover:bg-muted">
              <Pill className="size-4" aria-hidden /> Manage
            </Link>
          }
        >
          {meds.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {meds.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">None recorded.</p>
          )}
        </HealthBox>
        <HealthBox title="Allergies" action={list("allergies", "Allergies", "Allergy", "e.g. Penicillin (hives)")}>
          {child.allergies.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {child.allergies.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">None recorded.</p>
          )}
        </HealthBox>
        <HealthBox title="Emergency contacts" action={<ContactsEditor child={child} />}>
          {child.emergencyContacts.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {child.emergencyContacts.map((c) => (
                <li key={`${c.name}-${c.phone}`}>
                  <p className="font-semibold">
                    {c.name}
                    {c.relationship && <span className="font-normal text-muted-foreground"> · {c.relationship}</span>}
                  </p>
                  <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="text-muted-foreground hover:underline">
                    {c.phone}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">None added yet.</p>
          )}
        </HealthBox>
      </HealthDetails>

      {child.id.startsWith("kid-") && <RemoveChild childId={child.id} name={child.firstName} />}
    </div>
  );
}

function HealthBox({ title, action, children }: { title: string; action: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-white p-4" aria-label={title}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-extrabold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
