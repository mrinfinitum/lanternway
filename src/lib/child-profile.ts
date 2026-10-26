/**
 * Validating and tidying a child's profile before it's saved to the database.
 * Used by "Add a child" and by About Me edits. Everything is re-checked on the
 * server, so a tampered request can't store unexpected shapes or huge values.
 *
 * Also safe to import in the browser (no server-only code): the Add a child
 * flow uses draftIntro().
 */

import type { Child, CommunicationStyle, Diagnosis, EmergencyContact, SchoolPlanStatus } from "@/lib/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for children saved to a family in the database (sample kids have ids like "child-maya"). */
export const isSavedChildId = (id: string) => UUID.test(id);

/** Cap on kids per family in the prototype, to keep things tidy. */
export const MAX_CHILDREN = 12;

const STYLES: CommunicationStyle[] = ["speaking", "limited-speech", "aac", "nonverbal", "speaking-and-aac"];
const PLAN_STATUSES: SchoolPlanStatus[] = ["iep", "504", "evaluating", "none", "unsure"];

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const list = (v: unknown, maxItems = 12, maxLen = 80) =>
  Array.isArray(v) ? [...new Set(v.map((x) => str(x, maxLen)).filter(Boolean))].slice(0, maxItems) : [];
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

/** What the "Add a child" flow collects. */
export type NewChildInput = {
  firstName: string;
  birthDate: string;
  pronouns?: string;
  grade?: string;
  schoolName?: string;
  planStatus?: SchoolPlanStatus;
  likes: string[];
  strengths: string[];
  communicationStyle: CommunicationStyle;
  communicationNotes?: string;
  sensoryNeeds: string[];
  triggers: string[];
  calmingStrategies: string[];
  aboutMe: string;
};

/** Validate and tidy input from the flow. Returns a problem message or a clean Child. */
export function buildChild(input: unknown, id: string, today: string): Child | string {
  const v = (input ?? {}) as Record<string, unknown>;
  const firstName = str(v.firstName, 40);
  const birthDate = str(v.birthDate, 10);
  if (!firstName) return "Please add a first name.";
  if (!isDate(birthDate)) return "Please add a birthday.";
  if (birthDate > today) return "The birthday can't be in the future.";

  const style = STYLES.includes(v.communicationStyle as CommunicationStyle) ? (v.communicationStyle as CommunicationStyle) : "speaking";
  const planStatus = PLAN_STATUSES.includes(v.planStatus as SchoolPlanStatus) ? (v.planStatus as SchoolPlanStatus) : undefined;
  const grade = str(v.grade, 40);
  const schoolName = str(v.schoolName, 80);

  return {
    id,
    firstName,
    birthDate,
    pronouns: str(v.pronouns, 20) || undefined,
    diagnoses: [],
    communicationStyle: style,
    communicationNotes: str(v.communicationNotes, 400),
    sensoryNeeds: list(v.sensoryNeeds),
    triggers: list(v.triggers),
    calmingStrategies: list(v.calmingStrategies),
    likes: list(v.likes),
    dislikes: [],
    strengths: list(v.strengths),
    dailyLife: [],
    allergies: [],
    school: grade || schoolName || planStatus ? { grade: grade || undefined, name: schoolName || undefined, planStatus } : undefined,
    emergencyContacts: [],
    aboutMe: str(v.aboutMe, 600),
  };
}

const diagnoses = (v: unknown): Diagnosis[] =>
  Array.isArray(v)
    ? v
        .map((d) => (d ?? {}) as Record<string, unknown>)
        .map((d) => ({
          name: str(d.name, 80),
          tag: str(d.tag, 30) || str(d.name, 80).toLowerCase().split(/[^a-z]+/)[0],
          diagnosedOn: str(d.diagnosedOn, 10),
          diagnosedBy: str(d.diagnosedBy, 80) || undefined,
          notes: str(d.notes, 300) || undefined,
        }))
        .filter((d) => d.name && isDate(d.diagnosedOn))
        .slice(0, 12)
    : [];

const contacts = (v: unknown): EmergencyContact[] =>
  Array.isArray(v)
    ? v
        .map((c) => (c ?? {}) as Record<string, unknown>)
        .map((c) => ({ name: str(c.name, 60), relationship: str(c.relationship, 40), phone: str(c.phone, 30) }))
        .filter((c) => c.name && c.phone)
        .slice(0, 8)
    : [];

/** A whole saved profile (from About Me edits), checked field by field. */
export function sanitizeChild(input: unknown, id: string, today: string): Child | string {
  const v = (input ?? {}) as Record<string, unknown>;
  const school = (v.school ?? {}) as Record<string, unknown>;
  const base = buildChild({ ...v, grade: school.grade, schoolName: school.name, planStatus: school.planStatus }, id, today);
  if (typeof base === "string") return base;
  return {
    ...base,
    dislikes: list(v.dislikes),
    dailyLife: list(v.dailyLife),
    allergies: list(v.allergies),
    diagnoses: diagnoses(v.diagnoses),
    emergencyContacts: contacts(v.emergencyContacts),
    aboutMeHealth: str(v.aboutMeHealth, 300) || undefined,
  };
}

/** First-person intro drafted from the answers. The parent can edit it before saving. */
export function draftIntro(a: Pick<NewChildInput, "firstName" | "likes" | "communicationStyle" | "triggers" | "calmingStrategies">): string {
  const joinNice = (items: string[]) =>
    items.length <= 1
      ? (items[0] ?? "")
      : items.length === 2
        ? `${items[0]} and ${items[1]}`
        : `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
  const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
  const parts = [`Hi! I'm ${a.firstName || "…"}.`];
  if (a.likes.length) parts.push(`I love ${joinNice(a.likes.slice(0, 3).map(lower))}.`);
  const talk: Record<CommunicationStyle, string> = {
    speaking: "",
    "limited-speech": "I use a few words, and I show you what I mean in other ways too.",
    aac: "I talk with my AAC device. Please give me time to answer.",
    nonverbal: "I don't use words to talk, but I understand a lot and show you in other ways.",
    "speaking-and-aac": "I talk with words, and sometimes with my AAC when words get hard.",
  };
  if (talk[a.communicationStyle]) parts.push(talk[a.communicationStyle]);
  if (a.triggers.length) parts.push(`${a.triggers[0]} can be hard for me.`);
  if (a.calmingStrategies.length) parts.push(`${a.calmingStrategies[0]} helps a lot.`);
  return parts.join(" ");
}
