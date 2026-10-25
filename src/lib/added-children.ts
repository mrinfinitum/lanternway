/**
 * Stage 1 stand-in for saving a new child to the database.
 *
 * Children added with the "Add a child" flow are kept in httpOnly cookies on
 * the parent's own browser (one cookie per child, ~2 KB each), so the new
 * child works on every screen and survives a reload. Everything read back is
 * re-checked here, because a cookie can be edited by hand.
 *
 * Stage 2 replaces this file with a Supabase insert (with RLS).
 */

import type { Child, CommunicationStyle, SchoolPlanStatus } from "@/lib/types";

export const ADDED_CHILD_COOKIE_PREFIX = "lw-kid-";
export const MAX_ADDED_CHILDREN = 3;

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

/** Read one cookie value back into a Child, or null if it doesn't check out. */
export function parseAddedChild(raw: string | undefined, today: string): Child | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    const id = str(data.id, 40);
    if (!/^kid-[a-z0-9]{8}$/.test(id)) return null;
    const school = (data.school ?? {}) as Record<string, unknown>;
    const child = buildChild({ ...data, grade: school.grade, schoolName: school.name, planStatus: school.planStatus }, id, today);
    return typeof child === "string" ? null : child;
  } catch {
    return null;
  }
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
