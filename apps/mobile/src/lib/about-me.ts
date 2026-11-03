/** About Me sections on the phone, in the website's order and words (apps/web/src/app/(app)/about-me/about-me-view.tsx). */

export type ListField = "strengths" | "likes" | "dislikes" | "calmingStrategies" | "sensoryNeeds" | "triggers" | "dailyLife" | "allergies";

/** What the edit screen can change: one list, or one of the form sections. */
export type EditSection = ListField | "basics" | "communication" | "diagnoses" | "contacts";

export const listSections: { field: Exclude<ListField, "allergies">; title: string; itemLabel: string; placeholder: string; empty?: (name: string) => string }[] = [
  { field: "strengths", title: "My strengths", itemLabel: "Strength", placeholder: "e.g. Great memory for animal facts", empty: (name) => `What is ${name} good at, or proud of?` },
  { field: "likes", title: "Things I love", itemLabel: "Thing they love", placeholder: "e.g. Trains" },
  { field: "dislikes", title: "Not a fan of", itemLabel: "Thing they don’t like", placeholder: "e.g. Socks with seams", empty: () => "Nothing added." },
  { field: "calmingStrategies", title: "What helps me", itemLabel: "Thing that helps", placeholder: "e.g. A heads-up before changes" },
  { field: "sensoryNeeds", title: "Sensory needs", itemLabel: "Sensory need", placeholder: "e.g. Headphones in loud places" },
  { field: "triggers", title: "Things that are hard for me", itemLabel: "Hard thing", placeholder: "e.g. Sudden changes in plans" },
  { field: "dailyLife", title: "My day", itemLabel: "Routine or note", placeholder: "e.g. Bedtime is 8:30 with a story", empty: () => "Routines, meals, sleep, and safety notes." },
];

export const allergiesSection = { field: "allergies" as const, title: "Allergies", itemLabel: "Allergy", placeholder: "e.g. Penicillin (hives)" };

export const isListField = (v: string): v is ListField => v === "allergies" || listSections.some((s) => s.field === v);

export const isEditSection = (v: unknown): v is EditSection =>
  typeof v === "string" && (isListField(v) || ["basics", "communication", "diagnoses", "contacts"].includes(v));
