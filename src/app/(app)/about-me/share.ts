/**
 * What can go on a shared About Me, and how a shared version is built.
 *
 * `buildSharedProfile` copies only the sections the parent included, so
 * anything left out never reaches the one-pager (or, in Stage 2, the
 * public `/a/[token]` page that will call this same function on the server).
 */

/** Everything the parent sees on the About Me page. */
export type AboutMeProfile = {
  firstName: string;
  age: number;
  pronouns?: string;
  /** General intro, safe for every audience. */
  intro: string;
  /** Private part of the intro. Shared only with diagnoses. */
  introHealth?: string;
  strengths: string[];
  likes: string[];
  dislikes: string[];
  communication: string;
  helps: string[];
  sensory: string[];
  hard: string[];
  dailyLife: string[];
  diagnoses: string[];
  medications: string[];
  allergies: string[];
  contacts: string[];
};

export type SectionKey =
  | "strengths"
  | "likes"
  | "dislikes"
  | "communication"
  | "helps"
  | "sensory"
  | "hard"
  | "dailyLife"
  | "diagnoses"
  | "medications"
  | "allergies"
  | "contacts";

export type SectionDef = {
  key: SectionKey;
  /** Switch label in the share dialog. */
  label: string;
  /** Heading on the one-pager (first person). */
  title: string;
  /** Health & safety info: off in every preset until the parent turns it on. */
  private: boolean;
};

/** In one-pager order. */
export const sectionDefs: SectionDef[] = [
  { key: "strengths", label: "My strengths", title: "Things I'm good at", private: false },
  { key: "likes", label: "Loves", title: "Things I love", private: false },
  { key: "dislikes", label: "Not a fan of", title: "Not a fan of", private: false },
  { key: "communication", label: "Communication", title: "How I communicate", private: false },
  { key: "helps", label: "What helps", title: "What helps me", private: false },
  { key: "sensory", label: "Sensory needs", title: "Sensory needs", private: false },
  { key: "hard", label: "Things that are hard", title: "Things that are hard for me", private: false },
  { key: "dailyLife", label: "Daily life", title: "My day", private: false },
  { key: "diagnoses", label: "Diagnoses", title: "Diagnoses", private: true },
  { key: "medications", label: "Medications", title: "Medications", private: true },
  { key: "allergies", label: "Allergies", title: "Allergies", private: true },
  { key: "contacts", label: "Emergency contacts", title: "If you need to reach my family", private: true },
];

export type ShareSelection = Record<SectionKey, boolean>;

export type Audience = "teacher" | "caregiver" | "medical" | "camp";

const general = (keys: SectionKey[]): ShareSelection =>
  Object.fromEntries(sectionDefs.map((d) => [d.key, !d.private && keys.includes(d.key)])) as ShareSelection;

/** Presets only choose general sections. Private sections always start off. */
export const presets: { value: Audience; label: string; selection: ShareSelection }[] = [
  {
    value: "teacher",
    label: "Teacher",
    selection: general(["strengths", "likes", "communication", "helps", "sensory", "hard"]),
  },
  {
    value: "caregiver",
    label: "Caregiver",
    selection: general(["strengths", "likes", "dislikes", "communication", "helps", "sensory", "hard", "dailyLife"]),
  },
  {
    value: "medical",
    label: "Medical",
    selection: general(["communication", "helps", "sensory", "hard"]),
  },
  {
    value: "camp",
    label: "Camp",
    selection: general(["strengths", "likes", "dislikes", "communication", "helps", "sensory", "hard", "dailyLife"]),
  },
];

export function presetFor(selection: ShareSelection): Audience | null {
  return presets.find((p) => sectionDefs.every((d) => p.selection[d.key] === selection[d.key]))?.value ?? null;
}

export type SharedSection =
  | { key: SectionKey; title: string; kind: "list"; items: string[] }
  | { key: SectionKey; title: string; kind: "text"; text: string };

/** Exactly what a shared About Me contains. Nothing else is copied in. */
export type SharedProfile = {
  firstName: string;
  age: number;
  pronouns?: string;
  intro: string;
  sections: SharedSection[];
};

export function buildSharedProfile(profile: AboutMeProfile, selection: ShareSelection): SharedProfile {
  const sections: SharedSection[] = [];
  for (const def of sectionDefs) {
    if (!selection[def.key]) continue;
    if (def.key === "communication") {
      if (profile.communication) sections.push({ key: def.key, title: def.title, kind: "text", text: profile.communication });
      continue;
    }
    const items = profile[def.key];
    if (items.length > 0) sections.push({ key: def.key, title: def.title, kind: "list", items });
  }

  const intro =
    selection.diagnoses && profile.introHealth ? `${profile.intro} ${profile.introHealth}` : profile.intro;

  return { firstName: profile.firstName, age: profile.age, pronouns: profile.pronouns, intro, sections };
}
